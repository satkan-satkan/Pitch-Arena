import { randomUUID } from "node:crypto";
import { z } from "zod";
import { readCatalog, arenaEdit, investorEdit } from "./catalog.js";
const error = (status, code) => {
  throw Object.assign(new Error(code), { status });
};
export async function audit(store, actor, action, type, id, details) {
  await store.run(
    "INSERT INTO audit_events VALUES(?,?,?,?,?,?,?)",
    randomUUID(),
    actor,
    action,
    type,
    id,
    JSON.stringify(details),
    new Date().toISOString(),
  );
}
export async function grantOwner(store, email) {
  return store.transaction(async () => {
    await store.lock("admin:mutations");
    const user = await store.get(
      "SELECT id,role,status FROM users WHERE email=?",
      email.trim().toLowerCase(),
    );
    if (!user) error(404, "USER_NOT_FOUND");
    if (user.status !== "active") error(409, "USER_BLOCKED");
    if (user.role === "admin") return { id: user.id, changed: false };
    await store.run("UPDATE users SET role='admin' WHERE id=?", user.id);
    await audit(store, null, "owner.granted", "user", user.id, {
      method: "server-cli",
      before: user.role,
      after: "admin",
    });
    return { id: user.id, changed: true };
  });
}
const userEdit = z
  .object({
    role: z.enum(["member", "admin"]),
    status: z.enum(["active", "blocked"]),
    expectedRole: z.enum(["member", "admin"]),
    expectedStatus: z.enum(["active", "blocked"]),
    reason: z.string().trim().min(3).max(300),
  })
  .strict();
export async function handleAdmin({ req, url, user, store, body, aiReady }) {
  if (!user) error(401, "LOGIN_REQUIRED");
  if (user.role !== "admin") error(403, "ADMIN_REQUIRED");
  const path = url.pathname;
  const page = Math.max(
    0,
    Math.min(100000, Number(url.searchParams.get("page")) || 0),
  );
  const limit = 30,
    offset = Math.floor(page) * limit;
  const q = (url.searchParams.get("q") || "").slice(0, 100).toLowerCase();
  if (req.method === "GET") {
    if (path === "/api/admin/overview") {
      const counts = {};
      for (const table of ["users", "projects", "sessions", "assets"])
        counts[table] = Number(
          (await store.get(`SELECT count(*) AS n FROM ${table}`)).n,
        );
      counts.completed = Number(
        (
          await store.get(
            "SELECT count(*) AS n FROM sessions WHERE status='completed'",
          )
        ).n,
      );
      counts.blocked = Number(
        (
          await store.get(
            "SELECT count(*) AS n FROM users WHERE status='blocked'",
          )
        ).n,
      );
      counts.storageBytes = Number(
        (await store.get("SELECT coalesce(sum(bytes),0) AS n FROM assets")).n,
      );
      return { counts, aiReady, database: store.dialect };
    }
    if (path === "/api/admin/users") {
      const where = "WHERE lower(email) LIKE ?";
      const rows = await store.all(
        `SELECT id,email,profile,role,status,created_at FROM users ${where} ORDER BY created_at DESC,id LIMIT ? OFFSET ?`,
        `%${q}%`,
        limit,
        offset,
      );
      return {
        items: rows.map((r) => ({
          id: r.id,
          email: r.email,
          name: JSON.parse(r.profile).name,
          role: r.role,
          status: r.status,
          createdAt: r.created_at,
        })),
        total: Number(
          (
            await store.get(
              `SELECT count(*) AS n FROM users ${where}`,
              `%${q}%`,
            )
          ).n,
        ),
        page,
        limit,
      };
    }
    if (path === "/api/admin/projects") {
      const where = "WHERE lower(p.name) LIKE ?";
      const items = await store.all(
        `SELECT p.id,p.name,p.industry,p.created_at,u.email AS owner_email,(SELECT count(*) FROM sessions s WHERE s.project_id=p.id) AS session_count FROM projects p JOIN users u ON p.user_id=u.id ${where} ORDER BY p.created_at DESC,p.id LIMIT ? OFFSET ?`,
        `%${q}%`,
        limit,
        offset,
      );
      return {
        items,
        total: Number(
          (
            await store.get(
              `SELECT count(*) AS n FROM projects p ${where}`,
              `%${q}%`,
            )
          ).n,
        ),
        page,
        limit,
      };
    }
    if (path === "/api/admin/catalog") return readCatalog(store);
    if (path === "/api/admin/audit") {
      const items = await store.all(
        "SELECT a.id,a.action,a.target_type,a.target_id,a.details,a.created_at,u.email AS actor_email FROM audit_events a LEFT JOIN users u ON a.actor_id=u.id ORDER BY a.created_at DESC,a.id LIMIT ? OFFSET ?",
        limit,
        offset,
      );
      return {
        items: items.map((r) => ({ ...r, details: JSON.parse(r.details) })),
        total: Number(
          (await store.get("SELECT count(*) AS n FROM audit_events")).n,
        ),
        page,
        limit,
      };
    }
  }
  const userMatch = path.match(/^\/api\/admin\/users\/([^/]+)$/);
  const catalogMatch = path.match(
    /^\/api\/admin\/catalog\/(arena|investor)\/([^/]+)$/,
  );
  if (req.method !== "PUT" || (!userMatch && !catalogMatch))
    error(404, "NOT_FOUND");
  const input = await body(req);
  return store.transaction(async () => {
    await store.lock("admin:mutations");
    const actor = await store.get(
      "SELECT role,status FROM users WHERE id=?",
      user.id,
    );
    if (actor?.role !== "admin" || actor.status !== "active")
      error(403, "ADMIN_REQUIRED");
    if (userMatch) {
      const change = userEdit.parse(input),
        id = userMatch[1];
      const target = await store.get(
        "SELECT id,role,status FROM users WHERE id=?",
        id,
      );
      if (!target) error(404, "NOT_FOUND");
      if (
        target.role !== change.expectedRole ||
        target.status !== change.expectedStatus
      )
        error(409, "STALE_ADMIN_DATA");
      if (
        id === user.id &&
        (change.role !== "admin" || change.status !== "active")
      )
        error(409, "SELF_LOCKOUT");
      if (target.role === change.role && target.status === change.status)
        return { ok: true };
      const count = Number(
        (
          await store.get(
            "SELECT count(*) AS n FROM users WHERE role='admin' AND status='active'",
          )
        ).n,
      );
      if (
        target.role === "admin" &&
        target.status === "active" &&
        (change.role !== "admin" || change.status !== "active") &&
        count <= 1
      )
        error(409, "LAST_ADMIN");
      await store.run(
        "UPDATE users SET role=?,status=? WHERE id=?",
        change.role,
        change.status,
        id,
      );
      if (change.status === "blocked")
        await store.run("DELETE FROM logins WHERE user_id=?", id);
      await audit(store, user.id, "user.updated", "user", id, {
        before: { role: target.role, status: target.status },
        after: { role: change.role, status: change.status },
        reason: change.reason,
      });
      return { ok: true };
    }
    const [, kind, id] = catalogMatch;
    const envelope = z
      .object({
        revision: z.number().int().min(1),
        data: z.unknown(),
        reason: z.string().trim().min(3).max(300),
      })
      .strict()
      .parse(input);
    const patch = (kind === "arena" ? arenaEdit : investorEdit).parse(
      envelope.data,
    );
    const row = await store.get(
      "SELECT * FROM catalog WHERE kind=? AND id=?",
      kind,
      id,
    );
    if (!row) error(404, "NOT_FOUND");
    if (row.revision !== envelope.revision) error(409, "STALE_ADMIN_DATA");
    if (kind === "arena" && id === "family" && !patch.enabled)
      error(409, "START_ARENA_REQUIRED");
    const before = JSON.parse(row.data),
      data = { ...before, ...patch };
    await store.run(
      "UPDATE catalog SET data=?,revision=revision+1,updated_at=? WHERE kind=? AND id=?",
      JSON.stringify(data),
      new Date().toISOString(),
      kind,
      id,
    );
    await audit(store, user.id, "catalog.updated", kind, id, {
      before: Object.fromEntries(Object.keys(patch).map((k) => [k, before[k]])),
      after: patch,
      revision: row.revision + 1,
      reason: envelope.reason,
    });
    return { ok: true, revision: row.revision + 1 };
  });
}
