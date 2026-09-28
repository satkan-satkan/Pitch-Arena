import { seedCatalog, readCatalog } from "./catalog.js";
import { handleAdmin } from "./admin.js";
import http from "node:http";
import { randomUUID, createHash } from "node:crypto";
import {
  mkdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
  statSync,
  createReadStream,
  unlinkSync,
} from "node:fs";
import { resolve, extname, sep } from "node:path";
import { ZodError } from "zod";

import {
  currentUser,
  publicUser,
  createLogin,
  readToken,
  tokenHash,
  hashPassword,
  checkPassword,
} from "./auth.js";
import {
  credentials,
  profileSchema,
  projectSchema,
  sessionSchema,
  draftSchema,
  answerSchema,
} from "./schemas.js";
import { historySchema } from "./history-schema.js";
import { createMentor } from "./mentor.js";
import { arenas, medalsFor } from "../src/game-data.js";
import {
  analyzePitch,
  createQuestions,
  createFollowUp,
  evaluateAnswer,
  evaluateSession,
} from "../src/practice/engine.js";
class HttpError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
  }
}
const fail = (status, code) => {
  throw new HttpError(status, code);
};
const json = (res, status, value, headers = {}) => {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...headers,
  });
  res.end(JSON.stringify(value));
};
async function body(req, limit = 256 * 1024, raw = false) {
  if (Number(req.headers["content-length"]) > limit) {
    req.resume();
    fail(413, "PAYLOAD_TOO_LARGE");
  }
  const bytes = await new Promise((accept, reject) => {
    let size = 0,
      chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size <= limit) chunks.push(chunk);
      else chunks = [];
    });
    req.on("end", () =>
      size > limit
        ? reject(new HttpError(413, "PAYLOAD_TOO_LARGE"))
        : accept(Buffer.concat(chunks)),
    );
    req.on("error", reject);
  });
  if (raw) return bytes;
  try {
    return JSON.parse(bytes.toString() || "{}");
  } catch {
    fail(400, "INVALID_JSON");
  }
}
const assetView = (a) => ({
  id: a.id,
  name: a.name,
  type: a.mime,
  size: a.bytes,
  url: `/api/assets/${a.id}`,
});
export function createApp({
  store,
  assetDir = resolve(".data/assets"),
  distDir = resolve("dist"),
  mentor = createMentor(),
  secureCookies = process.env.NODE_ENV === "production",
  origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    process.env.APP_ORIGIN,
  ].filter(Boolean),
} = {}) {
  if (!store) throw new Error("A database store is required");
  mkdirSync(assetDir, {
    recursive: true,
    mode: 0o700,
  });
  const ready = seedCatalog(store);
  const buckets = new Map();
  const respond = (status, payload) => ({ status, payload });
  function throttle(key, limit, period) {
    const now = Date.now();
    if (buckets.size > 5000)
      for (const [k, v] of buckets) if (v.until < now) buckets.delete(k);
    const b = buckets.get(key);
    if (!b || b.until < now) {
      buckets.set(key, {
        count: 1,
        until: now + period,
      });
      return;
    }
    if (++b.count > limit) fail(429, "RATE_LIMITED");
  }
  const ownedSession = async (id, user) =>
    (await store.get(
      "SELECT * FROM sessions WHERE id=? AND user_id=?",
      id,
      user.id,
    )) || fail(404, "NOT_FOUND");
  const snapshot = async (row) => ({
    ...JSON.parse(row.data),
    id: row.id,
    projectId: row.project_id,
    revision: row.revision,
    assets: (
      await store.all("SELECT * FROM assets WHERE session_id=?", row.id)
    ).map(assetView),
  });
  async function save(row, data, status = "draft") {
    const now = new Date().toISOString();
    const r = await store.run(
      "UPDATE sessions SET data=?,revision=revision+1,status=?,updated_at=? WHERE id=? AND revision=?",
      JSON.stringify(data),
      status,
      now,
      row.id,
      row.revision,
    );
    if (!r.changes) fail(409, "STALE_SESSION");
    return await snapshot(
      await store.get("SELECT * FROM sessions WHERE id=?", row.id),
    );
  }
  async function history(user) {
    const completed = (
      await store.all(
        "SELECT data FROM sessions WHERE user_id=? AND status='completed' ORDER BY updated_at DESC",
        user.id,
      )
    ).map((row) => JSON.parse(row.data).result);
    const imported = (
      await store.all("SELECT data FROM imports WHERE user_id=?", user.id)
    ).map((row) => JSON.parse(row.data));
    return [...completed, ...imported].sort(
      (a, b) => new Date(b.date) - new Date(a.date),
    );
  }
  const tFor = (lang) => (ru, en) => (lang === "en" ? en : ru);
  const readState = (row) => JSON.parse(row.data);
  async function handle(req, res) {
    await ready;
    res.setHeader("X-Content-Type-Options", "nosniff");
    const url = new URL(req.url, "http://localhost");
    const path = url.pathname;
    if (!path.startsWith("/api/")) return serveStatic(req, res, path);
    if (!["GET", "HEAD"].includes(req.method)) {
      const origin = req.headers.origin;
      const same = `${secureCookies ? "https" : "http"}://${req.headers.host}`;
      if (
        (origin && origin !== same && !origins.includes(origin)) ||
        req.headers["sec-fetch-site"] === "cross-site"
      )
        fail(403, "ORIGIN_REJECTED");
      if (
        req.method !== "POST" &&
        req.method !== "PUT" &&
        req.method !== "DELETE"
      )
        fail(405, "METHOD_NOT_ALLOWED");
      // Simple browser form submissions are never accepted as JSON mutations.
      if (
        !path.endsWith("/assets") &&
        !String(req.headers["content-type"]).startsWith("application/json")
      )
        fail(415, "JSON_REQUIRED");
    }
    const user = await currentUser(store, req);
    if (path.startsWith("/api/admin/"))
      return json(
        res,
        200,
        await handleAdmin({
          req,
          url,
          user,
          store,
          body,
          aiReady: mentor.ready,
        }),
      );
    if (path === "/api/catalog" && req.method === "GET")
      return json(res, 200, await readCatalog(store));
    if (path === "/api/health" && req.method === "GET")
      return json(res, 200, {
        ok: true,
        database: store.dialect,
        aiReady: mentor.ready,
      });
    if (path === "/api/bootstrap" && req.method === "GET")
      return json(res, 200, {
        catalog: await readCatalog(store),
        user: publicUser(user),
        aiReady: mentor.ready,
        projects: user
          ? await store.all(
              "SELECT id,name,industry,description FROM projects WHERE user_id=? ORDER BY created_at",
              user.id,
            )
          : [],
        history: user ? await history(user) : [],
        draft: user
          ? await (async () => {
              const row = await store.get(
                "SELECT * FROM sessions WHERE user_id=? AND status='draft'",
                user.id,
              );
              return row ? await snapshot(row) : null;
            })()
          : null,
      });
    if (
      ["/api/auth/register", "/api/auth/login"].includes(path) &&
      req.method === "POST"
    ) {
      throttle(`auth:${req.socket.remoteAddress}`, 15, 10 * 60000);
      const input = credentials.parse(await body(req));
      let account = await store.get(
        "SELECT * FROM users WHERE email=?",
        input.email,
      );
      if (path.endsWith("/register")) {
        if (account) fail(409, "EMAIL_IN_USE");
        const id = randomUUID(),
          profile = {
            name: input.name || input.email.split("@")[0],
            startup: "Мой стартап",
            industry: "SaaS & AI",
            bio: "",
          };
        const password = await hashPassword(input.password);
        try {
          await store.run(
            "INSERT INTO users(id,email,password_hash,profile,created_at) VALUES(?,?,?,?,?)",
            id,
            input.email,
            password,
            JSON.stringify(profile),
            new Date().toISOString(),
          );
        } catch (error) {
          if (error.code === "23505" || error.code?.startsWith("ERR_SQLITE"))
            fail(409, "EMAIL_IN_USE");
          throw error;
        }
        account = await store.get("SELECT * FROM users WHERE id=?", id);
      } else {
        // Same slow verification path for unknown accounts.
        const encoded =
          account?.password_hash || `${"0".repeat(32)}:${"0".repeat(128)}`;
        if (!(await checkPassword(input.password, encoded)) || !account)
          fail(401, "INVALID_CREDENTIALS");
      }
      if (account.status === "blocked") fail(403, "ACCOUNT_BLOCKED");
      return json(
        res,
        200,
        {
          user: publicUser(account),
        },
        {
          "Set-Cookie": await createLogin(store, account.id, secureCookies),
        },
      );
    }
    if (path === "/api/auth/logout" && req.method === "POST") {
      await store.run(
        "DELETE FROM logins WHERE token_hash=?",
        tokenHash(readToken(req)),
      );
      return json(
        res,
        200,
        {
          ok: true,
        },
        {
          "Set-Cookie": `pa_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secureCookies ? "; Secure" : ""}`,
        },
      );
    }
    if (!user) fail(401, "LOGIN_REQUIRED");
    if (path === "/api/profile" && req.method === "PUT") {
      const profile = profileSchema.parse(await body(req));
      await store.run(
        "UPDATE users SET profile=? WHERE id=?",
        JSON.stringify(profile),
        user.id,
      );
      return json(res, 200, {
        profile,
      });
    }
    if (path === "/api/projects" && req.method === "POST") {
      const input = projectSchema.parse(await body(req));
      if (
        (
          await store.get(
            "SELECT count(*) AS n FROM projects WHERE user_id=?",
            user.id,
          )
        ).n >= 50
      )
        fail(409, "PROJECT_LIMIT");
      const id = randomUUID();
      await store.run(
        "INSERT INTO projects VALUES(?,?,?,?,?,?)",
        id,
        user.id,
        input.name,
        input.industry,
        input.description,
        new Date().toISOString(),
      );
      return json(res, 201, {
        id,
        ...input,
      });
    }
    if (/^\/api\/projects\/[^/]+$/.test(path) && req.method === "PUT") {
      const input = projectSchema.parse(await body(req));
      const id = path.split("/").at(-1);
      if (
        !(
          await store.run(
            "UPDATE projects SET name=?,industry=?,description=? WHERE id=? AND user_id=?",
            input.name,
            input.industry,
            input.description,
            id,
            user.id,
          )
        ).changes
      )
        fail(404, "NOT_FOUND");
      return json(res, 200, {
        id,
        ...input,
      });
    }
    if (path === "/api/history/import" && req.method === "POST") {
      const { records } = await body(req, 2 * 1024 * 1024);
      if (!Array.isArray(records) || records.length > 200)
        fail(400, "INVALID_IMPORT");
      let count = 0;
      await store.transaction(async () => {
        for (const raw of records) {
          const parsed = historySchema.safeParse(raw);
          if (!parsed.success) continue;
          const item = parsed.data;
          if (!arenas.some((a) => a.id === item.arenaId)) continue;
          const sourceId = createHash("sha256")
            .update(
              JSON.stringify({
                id: item.id,
                date: item.date,
                startup: item.startup,
                arenaId: item.arenaId,
              }),
            )
            .digest("hex");
          const safe = {
            ...item,
            id: `import-${sourceId}`,
            imported: true,
            serverVerified: false,
            score: Math.min(100, Math.max(0, item.score)),
            xp: Math.min(500, Math.max(0, item.xp ?? 100)),
          };
          count += Number(
            (
              await store.run(
                "INSERT INTO imports VALUES(?,?,?) ON CONFLICT(user_id,source_id) DO NOTHING",
                user.id,
                sourceId,
                JSON.stringify(safe),
              )
            ).changes,
          );
        }
      });
      return json(res, 200, {
        count,
        history: await history(user),
      });
    }
    if (path === "/api/sessions" && req.method === "POST") {
      const input = sessionSchema.parse(await body(req));
      const project = await store.get(
        "SELECT * FROM projects WHERE id=? AND user_id=?",
        input.projectId,
        user.id,
      );
      if (!project) fail(404, "NOT_FOUND");
      const selectedArena = (await readCatalog(store)).arenas.find(
        (a) => a.id === input.arenaId,
      );
      if (!selectedArena) fail(400, "INVALID_ARENA");
      if (!selectedArena.enabled) fail(409, "ARENA_UNAVAILABLE");
      if (input.personaId) {
        if (!selectedArena.personaIds?.includes(input.personaId))
          fail(400, "INVALID_PERSONA");
        selectedArena.personaIds = [input.personaId];
        selectedArena.panelMembers = selectedArena.panelMembers.filter(
          (v) => v.id === input.personaId,
        );
      }
      if (
        await store.get(
          "SELECT id FROM sessions WHERE user_id=? AND status='draft'",
          user.id,
        )
      )
        fail(409, "DRAFT_EXISTS");
      const id = randomUUID(),
        now = new Date().toISOString();
      const data = {
        config: {
          ...input,
          startup: project.name,
          arena: selectedArena,
        },
        state: {
          phase: "ready",
          pitch: "",
          answer: "",
          answers: [],
          step: 0,
          slide: 0,
          voiceEnabled: input.spokenQuestions,
          pitchDuration: 0,
          remaining: input.pitchSeconds,
          answerFeedback: null,
          analysis: null,
          questions: [],
          mentor: null,
          answerMentor: null,
          mentorAnswers: [],
        },
        startedAt: null,
        deadline: null,
      };
      try {
        await store.run(
          "INSERT INTO sessions VALUES(?,?,?,?,?,0,?,?)",
          id,
          user.id,
          input.projectId,
          "draft",
          JSON.stringify(data),
          now,
          now,
        );
      } catch (error) {
        if (error.code === "23505") fail(409, "DRAFT_EXISTS");
        throw error;
      }
      return json(res, 201, await snapshot(await ownedSession(id, user)));
    }
    const assetMatch = path.match(/^\/api\/assets\/([^/]+)$/);
    if (assetMatch && req.method === "GET") {
      const asset = await store.get(
        "SELECT * FROM assets WHERE id=? AND user_id=?",
        assetMatch[1],
        user.id,
      );
      if (!asset) fail(404, "NOT_FOUND");
      res.writeHead(200, {
        "Content-Type": asset.mime,
        "Content-Length": asset.bytes,
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store",
      });
      return createReadStream(asset.path)
        .on("error", () => res.destroy())
        .pipe(res);
    }
    const match = path.match(
      /^\/api\/sessions\/([^/]+)(?:\/(start|draft|analyze|answer|next|complete|assets))?$/,
    );
    if (!match) fail(404, "NOT_FOUND");
    const [, id, action] = match;
    await ownedSession(id, user);
    if (req.method === "GET" && !action)
      return json(res, 200, await snapshot(await ownedSession(id, user)));
    const output = await store.transaction(async () => {
      await store.lock(`session:${id}`);
      const row = await ownedSession(id, user);
      if (
        req.method === "POST" &&
        action === "complete" &&
        row.status === "completed"
      )
        return respond(200, {
          result: readState(row).result,
          revision: row.revision,
        });
      if (row.status !== "draft") fail(409, "SESSION_CLOSED");

      if (
        Number(req.headers["if-match"]) !== row.revision ||
        req.headers["if-match"] === undefined
      )
        fail(409, "STALE_SESSION");

      const data = readState(row),
        s = data.state,
        t = tFor(data.config.language),
        arena =
          data.config.arena || arenas.find((a) => a.id === data.config.arenaId);
      if (req.method === "DELETE" && !action) {
        for (const a of await store.all(
          "SELECT * FROM assets WHERE session_id=?",
          id,
        )) {
          try {
            unlinkSync(a.path);
          } catch {}
        }
        await store.run(
          "DELETE FROM sessions WHERE id=? AND user_id=?",
          id,
          user.id,
        );
        return respond(200, {
          ok: true,
        });
      }
      if (req.method === "POST" && action === "assets") {
        const existing = await store.all(
          "SELECT * FROM assets WHERE session_id=?",
          id,
        );
        if (s.phase !== "ready") fail(409, "UPLOAD_BEFORE_PITCH");
        const mime = String(req.headers["content-type"]),
          name = decodeURIComponent(
            String(req.headers["x-file-name"] || "slide"),
          ).slice(0, 200);
        if (
          ![
            "application/pdf",
            "image/png",
            "image/jpeg",
            "image/webp",
          ].includes(mime)
        )
          fail(415, "INVALID_FILE_TYPE");
        if (
          existing.length >= 20 ||
          (existing.length &&
            (mime === "application/pdf" ||
              existing.some((a) => a.mime === "application/pdf")))
        )
          fail(400, "INVALID_DECK");
        const bytes = await body(req, 20 * 1024 * 1024, true);
        const valid =
          mime === "application/pdf"
            ? bytes.subarray(0, 5).toString() === "%PDF-"
            : mime === "image/png"
              ? bytes
                  .subarray(0, 8)
                  .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
              : mime === "image/jpeg"
                ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
                : bytes.subarray(0, 4).toString() === "RIFF" &&
                  bytes.subarray(8, 12).toString() === "WEBP";
        if (!valid) fail(400, "INVALID_FILE_CONTENT");
        const used = (
          await store.get(
            "SELECT coalesce(sum(bytes),0) AS n FROM assets WHERE user_id=?",
            user.id,
          )
        ).n;
        if (
          used + bytes.length > 100 * 1024 * 1024 ||
          existing.reduce((sum, a) => sum + a.bytes, 0) + bytes.length >
            40 * 1024 * 1024
        )
          fail(413, "STORAGE_LIMIT");
        const assetId = randomUUID(),
          file = resolve(assetDir, assetId);
        writeFileSync(file, bytes, {
          mode: 0o600,
        });
        try {
          await store.run(
            "INSERT INTO assets VALUES(?,?,?,?,?,?,?)",
            assetId,
            id,
            user.id,
            name,
            mime,
            bytes.length,
            file,
          );
        } catch (error) {
          unlinkSync(file);
          throw error;
        }
        return respond(201, await save(row, data));
      }
      const input = await body(req);
      if (action === "draft" && req.method === "PUT") {
        const draft = draftSchema.parse(input);
        // The client may save text and view position, never answers, questions or rewards.
        if (s.phase === "analysis" && draft.phase === "review") {
          s.phase = "review";
          s.analysis = null;
          s.questions = [];
          s.mentor = null;
        }
        if (["ready", "pitch", "review"].includes(s.phase)) {
          if (draft.phase === "review" && s.phase === "pitch") {
            s.phase = "review";
            s.pitchDuration = Math.min(
              data.config.pitchSeconds,
              Math.max(0, Math.round((Date.now() - data.startedAt) / 1000)),
            );
          }
          if (
            s.phase === "review" ||
            s.phase === "pitch" ||
            s.phase === "ready"
          )
            s.pitch = draft.pitch;
        }
        s.answer = draft.answer;
        s.slide = draft.slide;
        s.voiceEnabled = draft.voiceEnabled;
        return respond(200, await save(row, data));
      }
      if (action === "start" && req.method === "POST") {
        if (s.phase !== "ready") fail(409, "INVALID_PHASE");
        data.startedAt = Date.now();
        data.deadline = data.startedAt + data.config.pitchSeconds * 1000;
        s.phase = "pitch";
        return respond(200, await save(row, data));
      }
      if (action === "analyze" && req.method === "POST") {
        if (!["review", "analysis"].includes(s.phase))
          fail(409, "INVALID_PHASE");
        const pitch = String(input.pitch || "").trim();
        if (pitch.length > 12000 || pitch.split(/\s+/).length < 10)
          fail(400, "PITCH_TOO_SHORT");
        s.pitch = pitch;
        s.analysis = analyzePitch(pitch, t);
        s.questions = createQuestions(pitch, arena, data.config.ask, t);
        s.mentor = null;
        if (data.config.useAI) {
          throttle(`ai:${user.id}`, 20, 3600000);
          try {
            const attachments = (
              await store.all("SELECT * FROM assets WHERE session_id=?", id)
            ).map((a) =>
              a.mime === "application/pdf"
                ? {
                    type: "input_file",
                    filename: a.name,
                    file_data: `data:application/pdf;base64,${readFileSync(a.path).toString("base64")}`,
                  }
                : {
                    type: "input_image",
                    image_url: `data:${a.mime};base64,${readFileSync(a.path).toString("base64")}`,
                  },
            );
            s.mentor = await mentor.reviewPitch({
              pitch,
              questions: s.questions,
              language: data.config.language,
              arena: arena.id,
              ask: data.config.ask,
              attachments,
            });
            s.questions = s.questions.map((q, i) => ({
              ...q,
              text: s.mentor.questions[i].text,
            }));
          } catch {
            s.mentor = {
              unavailable: true,
              reason: mentor.ready ? "AI_UNAVAILABLE" : "AI_NOT_CONFIGURED",
            };
          }
        }
        s.phase = "analysis";
        return respond(200, await save(row, data));
      }
      if (action === "next" && req.method === "POST") {
        if (s.phase === "analysis") {
          s.phase = "qa";
        } else if (
          s.phase === "qa" &&
          s.answerFeedback &&
          s.step < s.questions.length - 1
        ) {
          s.step++;
          s.answer = "";
          s.answerFeedback = null;
          s.answerMentor = null;
        } else fail(409, "INVALID_PHASE");
        return respond(200, await save(row, data));
      }
      if (action === "answer" && req.method === "POST") {
        const { step, answer } = answerSchema.parse(input);
        if (s.phase !== "qa" || step !== s.step || s.answerFeedback)
          fail(409, "INVALID_PHASE");
        const question = s.questions[step],
          report = evaluateAnswer(answer, question);
        s.answers.push(answer);
        s.answer = answer;
        s.answerFeedback = report;
        s.answerMentor = null;
        if (data.config.useAI && mentor.ready) {
          throttle(`ai:${user.id}`, 20, 3600000);
          try {
            s.answerMentor = await mentor.reviewAnswer({
              pitch: s.pitch,
              question,
              answer,
              previous: s.answers.slice(0, -1),
              language: data.config.language,
            });
          } catch {
            s.answerMentor = {
              unavailable: true,
            };
          }
        }
        (s.mentorAnswers ||= []).push(s.answerMentor);
        if (!s.questions.some((q) => q.followUp)) {
          let follow = createFollowUp(answer, question, report, t);
          if (s.answerMentor?.followUp)
            follow = {
              ...question,
              id: `${question.id}-followup`,
              parentId: question.id,
              followUp: true,
              text: s.answerMentor.followUp,
            };
          if (follow) s.questions.splice(step + 1, 0, follow);
        }
        return respond(200, await save(row, data));
      }
      if (action === "complete" && req.method === "POST") {
        if (
          s.phase !== "qa" ||
          !s.answerFeedback ||
          s.answers.length !== s.questions.length ||
          s.step !== s.questions.length - 1
        )
          fail(409, "INCOMPLETE_SESSION");
        const evaluation = evaluateSession({
          pitch: s.pitch,
          questions: s.questions,
          answers: s.answers,
          arena,
        });
        const prior = await history(user),
          earned = new Set(
            medalsFor(prior)
              .filter((m) => m.earned)
              .map((m) => m.id),
          );
        const result = {
          ...evaluation,
          id,
          projectId: row.project_id,
          startup: data.config.startup,
          arena: t(...arena.title),
          arenaId: arena.id,
          region: arena.region,
          ask: data.config.ask,
          date: new Date().toISOString(),
          duration: Math.max(
            1,
            Math.round((Date.now() - data.startedAt) / 1000),
          ),
          pitchDuration: s.pitchDuration,
          pitchLimit: data.config.pitchSeconds,
          pitchTranscript: s.pitch,
          questions: s.questions.map((q) => q.text),
          questionPlan: s.questions,
          answers: s.answers,
          mentor: s.mentor,
          mentorAnswers: s.mentorAnswers || [],
          practiceGoal: data.config.practiceGoal || null,
          serverVerified: true,
        };
        result.newMedals = medalsFor([result, ...prior]).filter(
          (m) => m.earned && !earned.has(m.id),
        );
        data.result = result;
        s.phase = "completed";
        const saved = await save(row, data, "completed");
        return respond(200, {
          result,
          revision: saved.revision,
        });
      }
      fail(405, "METHOD_NOT_ALLOWED");
    });
    return json(res, output.status, output.payload);
  }

  function serveStatic(req, res, path) {
    if (!["GET", "HEAD"].includes(req.method))
      return json(res, 405, {
        error: "METHOD_NOT_ALLOWED",
      });
    let file = resolve(distDir, `.${decodeURIComponent(path)}`);
    if (
      !file.startsWith(`${resolve(distDir)}${sep}`) &&
      file !== resolve(distDir)
    )
      return json(res, 404, {
        error: "NOT_FOUND",
      });
    if (!existsSync(file) || !statSync(file).isFile())
      file = resolve(distDir, "index.html");
    if (!existsSync(file))
      return json(res, 404, {
        error: "BUILD_NOT_FOUND",
      });
    const mime =
      {
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".svg": "image/svg+xml",
        ".mp3": "audio/mpeg",
        ".m4a": "audio/mp4",
      }[extname(file)] || "application/octet-stream";
    const size = statSync(file).size;
    res.setHeader("Content-Type", mime);
    res.setHeader("Accept-Ranges", "bytes");
    if (req.headers.range) {
      const m = req.headers.range.match(/^bytes=(\d+)-(\d*)$/);
      if (!m)
        return json(res, 416, {
          error: "INVALID_RANGE",
        });
      const start = Number(m[1]),
        end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
      if (start > end)
        return json(res, 416, {
          error: "INVALID_RANGE",
        });
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": end - start + 1,
      });
      return req.method === "HEAD"
        ? res.end()
        : createReadStream(file, {
            start,
            end,
          })
            .on("error", () => res.destroy())
            .pipe(res);
    }
    res.setHeader("Content-Length", size);
    return req.method === "HEAD"
      ? res.end()
      : createReadStream(file)
          .on("error", () => res.destroy())
          .pipe(res);
  }
  const server = http.createServer((req, res) =>
    handle(req, res).catch((error) => {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      const status = error instanceof ZodError ? 400 : error.status || 500;
      // Never log request bodies, passwords, slides, provider responses or keys.
      if (status === 500) console.error("API request failed", error.name);
      json(res, status, {
        error:
          error instanceof ZodError
            ? "INVALID_INPUT"
            : status === 500
              ? "SERVER_ERROR"
              : error.message,
      });
    }),
  );
  server.requestTimeout = 60000;
  return {
    server,
    store,
    ready,
  };
}
