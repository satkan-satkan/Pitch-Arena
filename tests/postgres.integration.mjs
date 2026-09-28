import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/app.js";
import { createPgTestStore } from "./postgres-fixture.mjs";
import { grantOwner } from "../server/admin.js";
import { openStore } from "../server/store.js";
import { importSqlite } from "../server/import-sqlite.js";
import { hashPassword, currentUser, tokenHash } from "../server/auth.js";
import { mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
async function fixture(t) {
  const store = await createPgTestStore(),
    dir = mkdtempSync(join(tmpdir(), "pitch-pg-"));
  const app = createApp({
    store,
    assetDir: join(dir, "assets"),
    mentor: { ready: false },
    secureCookies: false,
  });
  await app.ready;
  await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
  t.after(async () => {
    await new Promise((r) => app.server.close(r));
    await store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const request = async (
    path,
    { method = "GET", data, cookie, revision } = {},
  ) => {
    const res = await fetch(base + path, {
      method,
      headers: {
        ...(data !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
        ...(revision !== undefined ? { "If-Match": String(revision) } : {}),
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    return {
      status: res.status,
      data: await res.json(),
      cookie: res.headers.get("set-cookie")?.split(";")[0],
    };
  };
  const register = async (email, extra = {}) =>
    request("/api/auth/register", {
      method: "POST",
      data: {
        email,
        password: "testing password 12345",
        name: "Founder",
        ...extra,
      },
    });
  return { store, dir, request, register };
}
test("Admin permissions cannot be self-assigned and every administrative endpoint rejects members", async (t) => {
  const f = await fixture(t),
    member = await f.register("member@example.com", { role: "admin" });
  assert.equal(member.data.user.role, "member");
  for (const path of ["overview", "users", "projects", "catalog", "audit"])
    assert.equal(
      (await f.request(`/api/admin/${path}`, { cookie: member.cookie })).status,
      403,
    );
  assert.equal((await f.request("/api/admin/overview")).status, 401);
  assert.equal(
    (
      await f.request(`/api/admin/users/${member.data.user.id}`, {
        cookie: member.cookie,
        method: "PUT",
        data: { role: "admin" },
      })
    ).status,
    403,
  );
  await grantOwner(f.store, "member@example.com");
  assert.equal(
    (await f.request("/api/bootstrap", { cookie: member.cookie })).data.user
      .role,
    "admin",
  );
  const overview = await f.request("/api/admin/overview", {
    cookie: member.cookie,
  });
  assert.equal(overview.data.database, "postgres");
  assert.equal(overview.data.counts.users, 1);
  const users = await f.request("/api/admin/users", { cookie: member.cookie });
  assert.equal(users.data.items[0].password_hash, undefined);
  assert.equal(users.data.items[0].profile, undefined);
  const audit = await f.request("/api/admin/audit", { cookie: member.cookie });
  assert.equal(audit.data.items[0].action, "owner.granted");
});
test("Blocking revokes logins, preserves projects, and every change is audited atomically", async (t) => {
  const f = await fixture(t),
    admin = await f.register("admin@example.com"),
    member = await f.register("member@example.com");
  await grantOwner(f.store, "admin@example.com");
  await f.request("/api/projects", {
    method: "POST",
    cookie: member.cookie,
    data: { name: "Preserved startup" },
  });
  const change = {
    role: "member",
    status: "blocked",
    expectedRole: "member",
    expectedStatus: "active",
    reason: "Test access restriction",
  };
  assert.equal(
    (
      await f.request(`/api/admin/users/${member.data.user.id}`, {
        method: "PUT",
        cookie: admin.cookie,
        data: change,
      })
    ).status,
    200,
  );
  assert.equal(
    (await f.request("/api/bootstrap", { cookie: member.cookie })).data.user,
    null,
  );
  const login = await f.request("/api/auth/login", {
    method: "POST",
    data: { email: "member@example.com", password: "testing password 12345" },
  });
  assert.equal(login.status, 403);
  const projects = await f.request("/api/admin/projects", {
    cookie: admin.cookie,
  });
  assert.equal(projects.data.items[0].name, "Preserved startup");
  assert.equal(
    (
      await f.request(`/api/admin/users/${member.data.user.id}`, {
        method: "PUT",
        cookie: admin.cookie,
        data: change,
      })
    ).status,
    409,
  );
  const self = await f.request(`/api/admin/users/${admin.data.user.id}`, {
    method: "PUT",
    cookie: admin.cookie,
    data: { ...change, expectedRole: "admin" },
  });
  assert.equal(self.data.error, "SELF_LOCKOUT");
  const audits = (await f.request("/api/admin/audit", { cookie: admin.cookie }))
    .data.items;
  assert.equal(audits.filter((a) => a.action === "user.updated").length, 1);
});
test("Catalog edits reach players while existing sessions retain their arena and persona snapshot", async (t) => {
  const f = await fixture(t),
    admin = await f.register("admin@example.com");
  await grantOwner(f.store, "admin@example.com");
  const project = (
    await f.request("/api/projects", {
      method: "POST",
      cookie: admin.cookie,
      data: { name: "Test startup" },
    })
  ).data;
  const session = (
    await f.request("/api/sessions", {
      method: "POST",
      cookie: admin.cookie,
      data: {
        projectId: project.id,
        arenaId: "arena",
        ask: 10000,
        pitchSeconds: 120,
        language: "en",
      },
    })
  ).data;
  const catalog = (
    await f.request("/api/admin/catalog", { cookie: admin.cookie })
  ).data;
  const arena = catalog.arenas.find((a) => a.id === "arena");
  const edited = {
    title: ["Тестовая арена", "Test arena"],
    description: arena.description,
    pitchSeconds: 90,
    level: 4,
    enabled: false,
  };
  assert.equal(
    (
      await f.request("/api/admin/catalog/arena/arena", {
        method: "PUT",
        cookie: admin.cookie,
        data: {
          revision: arena.revision,
          data: edited,
          reason: "Test catalog update",
        },
      })
    ).status,
    200,
  );
  const publicCatalog = (await f.request("/api/catalog")).data;
  assert.equal(
    publicCatalog.arenas.find((a) => a.id === "arena").title[1],
    "Test arena",
  );
  const saved = (
    await f.request(`/api/sessions/${session.id}`, { cookie: admin.cookie })
  ).data;
  assert.deepEqual(saved.config.arena.title, arena.title);
  assert.equal(saved.config.arena.pitchSeconds, 120);
  assert.equal(
    (
      await f.request("/api/admin/catalog/arena/arena", {
        method: "PUT",
        cookie: admin.cookie,
        data: {
          revision: arena.revision,
          data: edited,
          reason: "Stale update",
        },
      })
    ).status,
    409,
  );
  const user = await f.register("other@example.com");
  const p = (
    await f.request("/api/projects", {
      method: "POST",
      cookie: user.cookie,
      data: { name: "Other" },
    })
  ).data;
  assert.equal(
    (
      await f.request("/api/sessions", {
        method: "POST",
        cookie: user.cookie,
        data: {
          projectId: p.id,
          arenaId: "arena",
          ask: 1000,
          pitchSeconds: 90,
          language: "en",
        },
      })
    ).data.error,
    "ARENA_UNAVAILABLE",
  );
  const family = catalog.arenas.find((a) => a.id === "family");
  assert.equal(
    (
      await f.request("/api/admin/catalog/arena/family", {
        method: "PUT",
        cookie: admin.cookie,
        data: {
          revision: family.revision,
          data: { ...edited, title: family.title },
          reason: "Disable starting point",
        },
      })
    ).data.error,
    "START_ARENA_REQUIRED",
  );
});
test("Database transactions roll back and conflicting concurrent revisions cannot overwrite a pitch", async (t) => {
  const f = await fixture(t),
    user = await f.register("member@example.com");
  await assert.rejects(() =>
    f.store.transaction(async () => {
      await f.store.run(
        "UPDATE users SET status='blocked' WHERE id=?",
        user.data.user.id,
      );
      throw new Error("rollback");
    }),
  );
  assert.equal(
    (
      await f.store.get(
        "SELECT status FROM users WHERE id=?",
        user.data.user.id,
      )
    ).status,
    "active",
  );
  const project = (
    await f.request("/api/projects", {
      method: "POST",
      cookie: user.cookie,
      data: { name: "Concurrent" },
    })
  ).data;
  const session = (
    await f.request("/api/sessions", {
      method: "POST",
      cookie: user.cookie,
      data: {
        projectId: project.id,
        arenaId: "family",
        ask: 1000,
        pitchSeconds: 120,
        language: "en",
      },
    })
  ).data;
  const responses = await Promise.all(
    ["First pitch", "Second pitch"].map((pitch) =>
      f.request(`/api/sessions/${session.id}/draft`, {
        method: "PUT",
        cookie: user.cookie,
        revision: session.revision,
        data: {
          phase: "ready",
          pitch,
          answer: "",
          slide: 0,
          voiceEnabled: false,
        },
      }),
    ),
  );
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
  const saved = (
    await f.request(`/api/sessions/${session.id}`, { cookie: user.cookie })
  ).data;
  assert.equal(
    saved.state.pitch,
    responses.find((r) => r.status === 200).data.state.pitch,
  );
});
test("SQLite import preserves IDs, password hashes, login tokens, records and private files, and is repeatable", async (t) => {
  const store = await createPgTestStore(),
    dir = mkdtempSync(join(tmpdir(), "pitch-import-"));
  t.after(async () => {
    await store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const source = join(dir, "legacy.sqlite"),
    db = openStore(source),
    password = await hashPassword("original password 12345");
  db.run(
    "INSERT INTO users(id,email,password_hash,profile,created_at) VALUES(?,?,?,?,?)",
    "user",
    "legacy@example.com",
    password,
    JSON.stringify({ name: "Legacy" }),
    "2026-09-28",
  );
  const token = "a".repeat(64);
  db.run(
    "INSERT INTO logins VALUES(?,?,?)",
    tokenHash(token),
    "user",
    Date.now() + 3600000,
  );
  db.run(
    "INSERT INTO projects VALUES(?,?,?,?,?,?)",
    "project",
    "user",
    "Legacy project",
    "",
    "",
    "2026-09-28",
  );
  const data = JSON.stringify({
    config: { arenaId: "family" },
    state: { phase: "review", pitch: "Original pitch" },
    result: { score: 70, xp: 150 },
  });
  db.run(
    "INSERT INTO sessions VALUES(?,?,?,?,?,?,?,?)",
    "session",
    "user",
    "project",
    "draft",
    data,
    7,
    "2026-09-28",
    "2026-09-28",
  );
  const file = join(dir, "slide.pdf");
  writeFileSync(file, "%PDF-1.4");
  db.run(
    "INSERT INTO assets VALUES(?,?,?,?,?,?,?)",
    "asset",
    "session",
    "user",
    "slide.pdf",
    "application/pdf",
    8,
    file,
  );
  db.run(
    "INSERT INTO imports VALUES(?,?,?)",
    "user",
    "old-result",
    JSON.stringify({ score: 30 }),
  );
  db.close();
  const result = await importSqlite(store, {
    source,
    backupRoot: join(dir, "backups"),
  });
  assert.deepEqual(result.counts, {
    users: 1,
    logins: 1,
    projects: 1,
    sessions: 1,
    assets: 1,
    imports: 1,
  });
  assert.equal(
    (await store.get("SELECT data FROM sessions WHERE id=?", "session")).data,
    data,
  );
  assert.equal(
    (await store.get("SELECT password_hash FROM users WHERE id=?", "user"))
      .password_hash,
    password,
  );
  assert.equal(
    (await currentUser(store, { headers: { cookie: `pa_session=${token}` } }))
      .id,
    "user",
  );
  assert.ok(existsSync(join(result.backupDir, "assets", "asset")));
  assert.equal(
    (await importSqlite(store, { source, backupRoot: join(dir, "backups") }))
      .alreadyImported,
    true,
  );
});
