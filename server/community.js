import { randomUUID } from "node:crypto";
import { z } from "zod";
import { audit } from "./admin.js";
import { imageSchema, normalizeListingImages } from "./images.js";
const fail = (status, code) => {
  throw Object.assign(new Error(code), { status });
};
const now = () => new Date().toISOString();
const https = z
  .string()
  .max(2000)
  .refine((value) => {
    if (!value) return true;
    try {
      const u = new URL(value);
      return (
        u.protocol === "https:" && !u.username && !u.password && !!u.hostname
      );
    } catch {
      return false;
    }
  }, "HTTPS required");
export const linksSchema = z
  .object(
    Object.fromEntries(
      [
        "website",
        "telegram",
        "x",
        "linkedin",
        "instagram",
        "youtube",
        "github",
      ].map((k) => [k, https.default("")]),
    ),
  )
  .strict();
const teamSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    description: z.string().trim().max(600),
    links: linksSchema,
  })
  .strict();
const listingSchema = z
  .object({
    logo: imageSchema,
    founderAvatar: imageSchema,
    founderName: z.string().trim().max(80).default(""),
    foundedMonth: z
      .string()
      .refine(
        (v) =>
          !v ||
          (/^(19|20)\d{2}-(0[1-9]|1[012])$/.test(v) &&
            v <= new Date().toISOString().slice(0, 7)),
      )
      .default(""),
    totalRevenue: z.number().finite().min(0).max(1e12).nullable().default(null),
    monthlyRecurringRevenue: z
      .number()
      .finite()
      .min(0)
      .max(1e12)
      .nullable()
      .default(null),
    name: z.string().trim().min(2).max(80),
    tagline: z.string().trim().min(10).max(160),
    description: z.string().trim().min(20).max(3000),
    category: z.enum([
      "ai",
      "saas",
      "fintech",
      "health",
      "climate",
      "education",
      "other",
    ]),
    stage: z.enum(["idea", "building", "live"]),
    region: z.string().trim().max(80),
    links: linksSchema,
    monthlyRevenue: z.number().finite().min(0).max(1e12).nullable(),
    currency: z.enum(["USD", "KZT", "RUB", "EUR"]),
  })
  .strict();
const revisionSchema = z
  .object({ revision: z.number().int().positive() })
  .strict();
const joined =
  "SELECT s.id,s.owner_id,s.team_id,s.created_at,l.data,l.revision,l.status,l.published_data,l.published_at,l.moderation_note,l.updated_at FROM startups s JOIN startup_listings l ON l.startup_id=s.id";
const privateView = (r) => ({
  id: r.id,
  teamId: r.team_id,
  data: JSON.parse(r.data),
  revision: r.revision,
  status: r.status,
  published: !!r.published_data,
  moderationNote: r.moderation_note,
  updatedAt: r.updated_at,
});
const publicView = (r) => ({
  id: r.id,
  ...JSON.parse(r.published_data),
  publishedAt: r.published_at,
  revenueVerification: "self_reported",
});
async function memberRole(store, team, user) {
  return (
    await store.get(
      "SELECT role FROM team_members WHERE team_id=? AND user_id=?",
      team,
      user.id,
    )
  )?.role;
}
async function accessible(store, id, user, edit = false) {
  const r = await store.get(`${joined} WHERE s.id=?`, id);
  if (!r) fail(404, "NOT_FOUND");
  const role = r.team_id
    ? await memberRole(store, r.team_id, user)
    : r.owner_id === user.id
      ? "owner"
      : null;
  if (!role || (edit && role === "member")) fail(403, "TEAM_ACCESS_REQUIRED");
  return { ...r, canEdit: role !== "member" };
}
export async function handleCommunity({ req, url, user, store, body }) {
  const path = url.pathname;
  if (req.method === "GET" && path === "/api/startups") {
    const q = (url.searchParams.get("q") || "")
      .trim()
      .toLowerCase()
      .slice(0, 100);
    const category = url.searchParams.get("category") || "";
    const sort = url.searchParams.get("sort") || "recent";
    const currency = url.searchParams.get("currency") || "USD";
    if (
      !["recent", "revenue"].includes(sort) ||
      !["USD", "KZT", "RUB", "EUR"].includes(currency)
    )
      fail(400, "INVALID_FILTER");
    const page = Math.max(
      0,
      Math.min(100000, Math.floor(Number(url.searchParams.get("page")) || 0)),
    );
    // Search only the approved snapshot; drafts never participate in public results.
    const where =
      "WHERE l.published_data IS NOT NULL AND (?='' OR CAST(l.published_data AS jsonb)->>'category'=?) AND position(? in lower((CAST(l.published_data AS jsonb)->>'name') || ' ' || (CAST(l.published_data AS jsonb)->>'tagline'))) > 0" +
      (sort === "revenue"
        ? " AND CAST(l.published_data AS jsonb)->>'monthlyRevenue' IS NOT NULL AND CAST(l.published_data AS jsonb)->>'currency'=?"
        : "");
    const params = [
      category,
      category,
      q,
      ...(sort === "revenue" ? [currency] : []),
    ];
    const order =
      sort === "revenue"
        ? "CAST(CAST(l.published_data AS jsonb)->>'monthlyRevenue' AS numeric) DESC,l.published_at DESC,s.id"
        : "l.published_at DESC,s.id";
    const rows = await store.all(
      `${joined} ${where} ORDER BY ${order} LIMIT 24 OFFSET ?`,
      ...params,
      page * 24,
    );
    const count = await store.get(
      `SELECT count(*) AS n FROM startup_listings l ${where}`,
      ...params,
    );
    return {
      items: rows.map(publicView),
      total: Number(count.n),
      page,
      limit: 24,
    };
  }
  const publicId = path.match(/^\/api\/startups\/([^/]+)$/);
  if (req.method === "GET" && publicId) {
    const r = await store.get(
      `${joined} WHERE s.id=? AND l.published_data IS NOT NULL`,
      publicId[1],
    );
    if (!r) fail(404, "NOT_FOUND");
    return publicView(r);
  }
  if (!user) fail(401, "LOGIN_REQUIRED");
  if (path === "/api/workspace/teams" && req.method === "GET") {
    const rows = await store.all(
      "SELECT t.*,m.role FROM teams t JOIN team_members m ON m.team_id=t.id WHERE m.user_id=? ORDER BY t.created_at",
      user.id,
    );
    const teams = [];
    for (const r of rows) {
      const members = await store.all(
        "SELECT m.user_id AS id,m.role,u.profile FROM team_members m JOIN users u ON u.id=m.user_id WHERE m.team_id=? ORDER BY m.role,u.id",
        r.id,
      );
      teams.push({
        id: r.id,
        data: JSON.parse(r.data),
        revision: r.revision,
        role: r.role,
        members: members.map((m) => ({
          id: m.id,
          role: m.role,
          name: JSON.parse(m.profile).name,
        })),
        invitations:
          r.role === "owner"
            ? await store.all(
                "SELECT id,email,role FROM team_invitations WHERE team_id=? AND status='pending'",
                r.id,
              )
            : [],
      });
    }
    return { teams };
  }
  if (path === "/api/workspace/invitations" && req.method === "GET") {
    if (!user.email_verified_at)
      return { items: [], verificationRequired: true };
    const rows = await store.all(
      "SELECT i.id,i.team_id,i.role,t.data FROM team_invitations i JOIN teams t ON t.id=i.team_id WHERE i.email=? AND i.status='pending'",
      user.email,
    );
    return {
      items: rows.map((r) => ({
        id: r.id,
        role: r.role,
        teamName: JSON.parse(r.data).name,
        teamId: r.team_id,
      })),
    };
  }
  if (path === "/api/workspace/startups" && req.method === "GET") {
    const rows = await store.all(
      `${joined} WHERE (s.team_id IS NULL AND s.owner_id=?) OR EXISTS(SELECT 1 FROM team_members m WHERE m.team_id=s.team_id AND m.user_id=?) ORDER BY l.updated_at DESC`,
      user.id,
      user.id,
    );
    const items = [];
    for (const r of rows)
      items.push({
        ...privateView(r),
        canEdit:
          !r.team_id || (await memberRole(store, r.team_id, user)) !== "member",
      });
    return { items };
  }
  if (!["POST", "PUT", "DELETE"].includes(req.method)) fail(404, "NOT_FOUND");
  const input = await body(req);
  // A single community lock keeps membership changes, edits, invitations and moderation consistent.
  return store.transaction(async () => {
    await store.lock("community:mutations");
    const active = await store.get(
      "SELECT status FROM users WHERE id=?",
      user.id,
    );
    if (active?.status !== "active") fail(401, "LOGIN_REQUIRED");
    if (path === "/api/workspace/teams" && req.method === "POST") {
      const data = teamSchema.parse(input),
        id = randomUUID();
      await store.run(
        "INSERT INTO teams VALUES(?,?,?,1,?)",
        id,
        user.id,
        JSON.stringify(data),
        now(),
      );
      await store.run(
        "INSERT INTO team_members VALUES(?,?,'owner')",
        id,
        user.id,
      );
      return { id };
    }
    const tm = path.match(
      /^\/api\/workspace\/teams\/([^/]+)(?:\/(invitations|members)(?:\/([^/]+))?)?$/,
    );
    if (tm) {
      const [, id, action, target] = tm;
      if ((await memberRole(store, id, user)) !== "owner")
        fail(403, "TEAM_OWNER_REQUIRED");
      if (!action && req.method === "PUT") {
        const e = z
          .object({ revision: z.number().int().positive(), data: teamSchema })
          .strict()
          .parse(input);
        const r = await store.run(
          "UPDATE teams SET data=?,revision=revision+1 WHERE id=? AND revision=?",
          JSON.stringify(e.data),
          id,
          e.revision,
        );
        if (!r.changes) fail(409, "STALE_LISTING");
        return { ok: true };
      }
      if (action === "invitations" && !target && req.method === "POST") {
        const e = z
          .object({
            email: z
              .email()
              .max(254)
              .transform((v) => v.trim().toLowerCase()),
            role: z.enum(["editor", "member"]),
          })
          .strict()
          .parse(input);
        if (e.email === user.email) fail(400, "ALREADY_MEMBER");
        const existing = await store.get(
          "SELECT m.user_id FROM team_members m JOIN users u ON u.id=m.user_id WHERE m.team_id=? AND u.email=?",
          id,
          e.email,
        );
        if (existing) fail(409, "ALREADY_MEMBER");
        const pending = await store.get(
          "SELECT id FROM team_invitations WHERE team_id=? AND email=? AND status='pending'",
          id,
          e.email,
        );
        if (pending) return { id: pending.id };
        const invite = randomUUID();
        await store.run(
          "INSERT INTO team_invitations VALUES(?,?,?,?,'pending',?)",
          invite,
          id,
          e.email,
          e.role,
          now(),
        );
        return { id: invite };
      }
      if (action === "invitations" && target && req.method === "DELETE") {
        await store.run(
          "UPDATE team_invitations SET status='cancelled' WHERE id=? AND team_id=? AND status='pending'",
          target,
          id,
        );
        return { ok: true };
      }
      if (action === "members" && target && req.method === "DELETE") {
        if (target === user.id) fail(409, "TEAM_OWNER_REQUIRED");
        await store.run(
          "DELETE FROM team_members WHERE team_id=? AND user_id=? AND role<>'owner'",
          id,
          target,
        );
        return { ok: true };
      }
    }
    const invitation = path.match(
      /^\/api\/workspace\/invitations\/([^/]+)\/(accept|decline)$/,
    );
    if (invitation && req.method === "POST") {
      if (!user.email_verified_at) fail(403, "EMAIL_VERIFICATION_REQUIRED");
      const r = await store.get(
        "SELECT * FROM team_invitations WHERE id=? AND email=? AND status='pending'",
        invitation[1],
        user.email,
      );
      if (!r) fail(404, "NOT_FOUND");
      if (invitation[2] === "accept")
        await store.run(
          "INSERT INTO team_members VALUES(?,?,?) ON CONFLICT(team_id,user_id) DO NOTHING",
          r.team_id,
          user.id,
          r.role,
        );
      await store.run(
        "UPDATE team_invitations SET status=? WHERE id=?",
        invitation[2] === "accept" ? "accepted" : "declined",
        r.id,
      );
      return { ok: true };
    }
    if (path === "/api/workspace/startups" && req.method === "POST") {
      const e = z
        .object({ teamId: z.string().uuid().nullable(), data: listingSchema })
        .strict()
        .parse(input);
      if (
        e.teamId &&
        !["owner", "editor"].includes(await memberRole(store, e.teamId, user))
      )
        fail(403, "TEAM_ACCESS_REQUIRED");
      await normalizeListingImages(e.data);
      const id = randomUUID(),
        date = now();
      await store.run(
        "INSERT INTO startups VALUES(?,?,?,?)",
        id,
        user.id,
        e.teamId,
        date,
      );
      await store.run(
        "INSERT INTO startup_listings(startup_id,data,updated_at) VALUES(?,?,?)",
        id,
        JSON.stringify(e.data),
        date,
      );
      return { id };
    }
    const listing = path.match(
      /^\/api\/workspace\/startups\/([^/]+)(?:\/(submit|withdraw|team))?$/,
    );
    if (listing) {
      const r = await accessible(store, listing[1], user, true);
      if (listing[2] === "team" && req.method === "POST") {
        const e = z
          .object({ revision: z.number().int().positive(), teamId: z.uuid() })
          .strict()
          .parse(input);
        if (r.team_id || r.owner_id !== user.id)
          fail(403, "PERSONAL_LISTING_REQUIRED");
        if ((await memberRole(store, e.teamId, user)) !== "owner")
          fail(403, "TEAM_OWNER_REQUIRED");
        if (e.revision !== r.revision) fail(409, "STALE_LISTING");
        await store.run(
          "UPDATE startups SET team_id=? WHERE id=?",
          e.teamId,
          r.id,
        );
        await store.run(
          "UPDATE startup_listings SET revision=revision+1,updated_at=? WHERE startup_id=?",
          now(),
          r.id,
        );
        await audit(store, user.id, "startup.team", "startup", r.id, {
          teamId: e.teamId,
        });
        return { ok: true };
      }
      if (!listing[2] && req.method === "PUT") {
        const e = z
          .object({
            revision: z.number().int().positive(),
            data: listingSchema,
          })
          .strict()
          .parse(input);
        if (e.revision !== r.revision) fail(409, "STALE_LISTING");
        await normalizeListingImages(e.data, JSON.parse(r.data));
        await store.run(
          "UPDATE startup_listings SET data=?,revision=revision+1,status='draft',moderation_note='',updated_at=? WHERE startup_id=?",
          JSON.stringify(e.data),
          now(),
          r.id,
        );
        return { ok: true };
      }
      if (listing[2] && req.method === "POST") {
        const e = revisionSchema.parse(input);
        if (e.revision !== r.revision) fail(409, "STALE_LISTING");
        if (listing[2] === "submit") {
          if (!["draft", "changes_requested"].includes(r.status))
            fail(409, "INVALID_LISTING_STATE");
          await store.run(
            "UPDATE startup_listings SET status='pending',revision=revision+1,moderation_note='',updated_at=? WHERE startup_id=?",
            now(),
            r.id,
          );
        } else
          await store.run(
            "UPDATE startup_listings SET status='draft',published_data=NULL,published_at=NULL,revision=revision+1,updated_at=? WHERE startup_id=?",
            now(),
            r.id,
          );
        await audit(store, user.id, `startup.${listing[2]}`, "startup", r.id, {
          revision: r.revision + 1,
        });
        return { ok: true };
      }
    }
    fail(404, "NOT_FOUND");
  });
}
export async function handleStartupModeration({ req, url, user, store, body }) {
  if (!user) fail(401, "LOGIN_REQUIRED");
  if (user.role !== "admin") fail(403, "ADMIN_REQUIRED");
  if (req.method === "GET" && url.pathname === "/api/admin/startups") {
    const page = Math.max(
      0,
      Math.min(100000, Math.floor(Number(url.searchParams.get("page")) || 0)),
    );
    const rows = await store.all(
      `${joined} ORDER BY CASE WHEN l.status='pending' THEN 0 ELSE 1 END,l.updated_at DESC,s.id LIMIT 30 OFFSET ?`,
      page * 30,
    );
    return {
      items: rows.map(privateView),
      page,
      limit: 30,
      total: Number((await store.get("SELECT count(*) AS n FROM startups")).n),
    };
  }
  const match = url.pathname.match(/^\/api\/admin\/startups\/([^/]+)$/);
  if (!match || req.method !== "PUT") fail(404, "NOT_FOUND");
  const e = z
    .object({
      revision: z.number().int().positive(),
      action: z.enum(["publish", "reject", "hide"]),
      reason: z.string().trim().min(3).max(500),
    })
    .strict()
    .parse(await body(req));
  return store.transaction(async () => {
    await store.lock("admin:mutations");
    await store.lock("community:mutations");
    const actor = await store.get(
      "SELECT role,status FROM users WHERE id=?",
      user.id,
    );
    if (actor?.role !== "admin" || actor.status !== "active")
      fail(403, "ADMIN_REQUIRED");
    const r = await store.get(`${joined} WHERE s.id=?`, match[1]);
    if (!r) fail(404, "NOT_FOUND");
    if (r.revision !== e.revision) fail(409, "STALE_LISTING");
    if (e.action === "hide" ? !r.published_data : r.status !== "pending")
      fail(409, "INVALID_LISTING_STATE");
    if (e.action === "publish")
      await store.run(
        "UPDATE startup_listings SET status='published',published_data=data,published_at=?,moderation_note=?,revision=revision+1,updated_at=? WHERE startup_id=?",
        now(),
        e.reason,
        now(),
        r.id,
      );
    else if (e.action === "reject")
      await store.run(
        "UPDATE startup_listings SET status='changes_requested',moderation_note=?,revision=revision+1,updated_at=? WHERE startup_id=?",
        e.reason,
        now(),
        r.id,
      );
    else
      await store.run(
        "UPDATE startup_listings SET status='changes_requested',published_data=NULL,published_at=NULL,moderation_note=?,revision=revision+1,updated_at=? WHERE startup_id=?",
        e.reason,
        now(),
        r.id,
      );
    await audit(store, user.id, `startup.${e.action}`, "startup", r.id, {
      reason: e.reason,
      revision: r.revision + 1,
      before: r.status,
      after: e.action === "publish" ? "published" : "changes_requested",
    });
    return { ok: true };
  });
}
