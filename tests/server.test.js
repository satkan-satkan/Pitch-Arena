import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../server/app.js";
import { openStore } from "../server/store.js";
import { createPgTestStore } from "./postgres-fixture.mjs";
import { createMentor } from "../server/mentor.js";
const pitch =
  "Small clinics waste hours on manual bookings. Our product automates bookings. We have 120 customers in the last month. Customers pay a subscription of $30 per month. We will use the funds for development and reach 200 customers in three months.";
async function fixture(t, mentor = { ready: false }) {
  const dir = mkdtempSync(join(tmpdir(), "pitch-api-"));
  const store = process.env.PA_TEST_POSTGRES
    ? await createPgTestStore()
    : openStore(join(dir, "db.sqlite"));
  const app = createApp({
    store,
    assetDir: join(dir, "assets"),
    mentor,
    secureCookies: false,
  });
  await new Promise((resolve) => app.server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  t.after(async () => {
    await new Promise((resolve) => app.server.close(resolve));
    await store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  async function request(
    path,
    { method = "GET", data, cookie, revision, headers = {}, raw } = {},
  ) {
    const response = await fetch(base + path, {
      method,
      headers: {
        ...(data !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
        ...(revision !== undefined ? { "If-Match": String(revision) } : {}),
        ...headers,
      },
      body: raw || (data === undefined ? undefined : JSON.stringify(data)),
    });
    const payload = response.headers.get("content-type")?.includes("json")
      ? await response.json()
      : Buffer.from(await response.arrayBuffer());
    return {
      status: response.status,
      data: payload,
      cookie: response.headers.get("set-cookie")?.split(";")[0],
      headers: response.headers,
    };
  }
  async function register(email = "founder@example.com") {
    return request("/api/auth/register", {
      method: "POST",
      data: { email, password: "a strong testing password", name: "Founder" },
    });
  }
  return { request, register, store, base };
}
async function newSession(f, cookie, extra = {}) {
  const p = await f.request("/api/projects", {
    cookie,
    method: "POST",
    data: { name: "Clinic" },
  });
  assert.equal(p.status, 201);
  const s = await f.request("/api/sessions", {
    cookie,
    method: "POST",
    data: {
      projectId: p.data.id,
      arenaId: "family",
      ask: 50000,
      pitchSeconds: 120,
      language: "en",
      ...extra,
    },
  });
  assert.equal(s.status, 201);
  return s.data;
}
test("Accounts use hashed credentials, HttpOnly sessions, login and logout", async (t) => {
  const f = await fixture(t),
    r = await f.register();
  assert.equal(r.status, 200);
  assert.match(r.headers.get("set-cookie"), /HttpOnly/);
  assert.match(r.headers.get("set-cookie"), /SameSite=Lax/);
  const row = await f.store.get("SELECT * FROM users");
  assert.ok(!row.password_hash.includes("testing"));
  assert.equal(r.data.user.password_hash, undefined);
  assert.equal(
    (await f.request("/api/bootstrap", { cookie: r.cookie })).data.user.email,
    "founder@example.com",
  );
  assert.equal(
    (
      await f.request("/api/auth/login", {
        method: "POST",
        data: { email: "founder@example.com", password: "wrong long password" },
      })
    ).status,
    401,
  );
  await f.request("/api/auth/logout", {
    cookie: r.cookie,
    method: "POST",
    data: {},
  });
  assert.equal(
    (await f.request("/api/bootstrap", { cookie: r.cookie })).data.user,
    null,
  );
  assert.equal(
    (
      await f.request("/api/auth/login", {
        method: "POST",
        data: {
          email: "founder@example.com",
          password: "a strong testing password",
        },
      })
    ).status,
    200,
  );
});
test("Foreign origins, simple form submissions and anonymous writes are rejected", async (t) => {
  const f = await fixture(t);
  assert.equal(
    (await f.request("/api/projects", { method: "POST", data: { name: "x" } }))
      .status,
    401,
  );
  assert.equal(
    (
      await f.request("/api/auth/register", {
        method: "POST",
        data: {},
        headers: { Origin: "https://other.example" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await f.request("/api/auth/register", {
        method: "POST",
        data: {},
        headers: { "Content-Type": "text/plain" },
      })
    ).status,
    415,
  );
});
test("Projects and session assets are private to the owner", async (t) => {
  const f = await fixture(t),
    alice = await f.register(),
    bob = await f.register("bob@example.com"),
    s = await newSession(f, alice.cookie);
  assert.equal(
    (await f.request(`/api/sessions/${s.id}`, { cookie: bob.cookie })).status,
    404,
  );
  assert.equal(
    (
      await f.request(`/api/projects/${s.projectId}`, {
        cookie: bob.cookie,
        method: "PUT",
        data: { name: "stolen" },
      })
    ).status,
    404,
  );
  const bytes = Buffer.from("%PDF-1.4\n% fixture");
  const upload = await f.request(`/api/sessions/${s.id}/assets`, {
    cookie: alice.cookie,
    method: "POST",
    revision: s.revision,
    raw: bytes,
    headers: { "Content-Type": "application/pdf", "X-File-Name": "test.pdf" },
  });
  assert.equal(upload.status, 201);
  const url = upload.data.assets[0].url;
  assert.equal((await f.request(url, { cookie: bob.cookie })).status, 404);
  assert.deepEqual(
    (await f.request(url, { cookie: alice.cookie })).data,
    bytes,
  );
});
test("Draft saves preserve text and reject stale tabs or client-supplied rewards", async (t) => {
  const f = await fixture(t),
    r = await f.register(),
    s = await newSession(f, r.cookie);
  const data = {
    phase: "ready",
    pitch: "A draft to restore",
    answer: "",
    slide: 0,
    voiceEnabled: false,
    score: 100,
    xp: 99999,
  };
  const saved = await f.request(`/api/sessions/${s.id}/draft`, {
    cookie: r.cookie,
    method: "PUT",
    revision: 0,
    data,
  });
  assert.equal(saved.status, 200);
  assert.equal(saved.data.state.pitch, data.pitch);
  assert.equal(saved.data.state.xp, undefined);
  assert.equal(
    (
      await f.request(`/api/sessions/${s.id}/draft`, {
        cookie: r.cookie,
        method: "PUT",
        revision: 0,
        data,
      })
    ).status,
    409,
  );
  const boot = await f.request("/api/bootstrap", { cookie: r.cookie });
  assert.equal(boot.data.draft.state.pitch, data.pitch);
  assert.equal(
    (
      await f.request("/api/sessions", {
        cookie: r.cookie,
        method: "POST",
        data: { ...s.config, projectId: s.projectId },
      })
    ).status,
    409,
  );
});
test("Server enforces pitch-first flow and awards a completed session only once", async (t) => {
  const f = await fixture(t),
    r = await f.register();
  let s = await newSession(f, r.cookie);
  async function action(name, data = {}, method = "POST") {
    const res = await f.request(`/api/sessions/${s.id}/${name}`, {
      cookie: r.cookie,
      revision: s.revision,
      method,
      data,
    });
    if (res.status === 200 && res.data.state) s = res.data;
    return res;
  }
  assert.equal((await action("analyze", { pitch })).status, 409);
  assert.equal((await action("complete", { xp: 100000 })).status, 409);
  await action("start");
  await action(
    "draft",
    { phase: "review", pitch, answer: "", slide: 0, voiceEnabled: false },
    "PUT",
  );
  await action("analyze", { pitch });
  await action("next");
  while (s.state.step < s.state.questions.length) {
    await action("answer", { step: s.state.step, answer: pitch });
    if (s.state.step === s.state.questions.length - 1) break;
    await action("next");
  }
  const result = await action("complete", { xp: 99999, score: 99999 });
  assert.equal(result.status, 200);
  assert.equal(result.data.result.score, 100);
  assert.equal(result.data.result.xp, 150);
  assert.equal(result.data.result.serverVerified, true);
  const again = await action("complete");
  assert.deepEqual(again.data.result, result.data.result);
  const boot = await f.request("/api/bootstrap", { cookie: r.cookie });
  assert.equal(boot.data.history.length, 1);
  assert.equal(boot.data.draft, null);
});
test("AI unavailable is explicit; it never blocks local rehearsal or invents a model review", async (t) => {
  const f = await fixture(t),
    r = await f.register();
  let s = await newSession(f, r.cookie, { useAI: true });
  for (const [action, data, method] of [
    ["start", {}, "POST"],
    [
      "draft",
      { phase: "review", pitch, answer: "", slide: 0, voiceEnabled: false },
      "PUT",
    ],
    ["analyze", { pitch }, "POST"],
  ]) {
    const res = await f.request(`/api/sessions/${s.id}/${action}`, {
      cookie: r.cookie,
      revision: s.revision,
      method,
      data,
    });
    assert.equal(res.status, 200);
    s = res.data;
  }
  assert.equal(s.state.mentor.unavailable, true);
  assert.equal(s.state.questions.length, 5);
  assert.equal(s.state.mentor.summary, undefined);
});
test("Import is explicit and idempotent, and never labels imported scores as server verified", async (t) => {
  const f = await fixture(t),
    r = await f.register(),
    record = {
      id: 1,
      date: "2026-09-28T10:00:00Z",
      arenaId: "family",
      startup: "Old",
      score: 60,
      xp: 150,
      questions: ["Why?"],
      answers: ["Because."],
      serverVerified: true,
    };
  const one = await f.request("/api/history/import", {
    cookie: r.cookie,
    method: "POST",
    data: { records: [record] },
  });
  const two = await f.request("/api/history/import", {
    cookie: r.cookie,
    method: "POST",
    data: { records: [record] },
  });
  assert.equal(one.data.count, 1);
  assert.equal(two.data.count, 0);
  assert.equal(two.data.history[0].serverVerified, false);
});
test("AI adapter uses server-only Responses requests, structured output, and literal evidence", async () => {
  let sent;
  const review = {
    summary: "A clear pitch",
    strengths: [{ quote: "Small clinics", comment: "Identifies the audience" }],
    improvements: [{ quote: "", comment: "Explain retention" }],
    deckNotes: "",
    questions: ["customer", "demand", "economics", "funding", "demo"].map(
      (id) => ({ id, text: `A specific question for ${id}?` }),
    ),
  };
  const mentor = createMentor({
    apiKey: "test-key",
    model: "test-model",
    fetchImpl: async (url, options) => {
      sent = { url, ...options };
      return new Response(
        JSON.stringify({
          status: "completed",
          output: [
            {
              content: [{ type: "output_text", text: JSON.stringify(review) }],
            },
          ],
        }),
        { status: 200 },
      );
    },
  });
  const result = await mentor.reviewPitch({
    pitch,
    questions: review.questions,
    language: "en",
    arena: "family",
    ask: 50000,
  });
  assert.equal(result.summary, "A clear pitch");
  const payload = JSON.parse(sent.body);
  assert.equal(payload.store, false);
  assert.equal(payload.text.format.type, "json_schema");
  assert.equal(payload.model, "test-model");
  assert.equal(sent.headers.Authorization, "Bearer test-key");
  review.strengths[0].quote = "Invented revenue";
  await assert.rejects(
    () =>
      mentor.reviewPitch({
        pitch,
        questions: review.questions,
        language: "en",
      }),
    /AI_UNGROUNDED/,
  );
});
test("SQLite data survives reopening the database", () => {
  const dir = mkdtempSync(join(tmpdir(), "pitch-db-"));
  const path = join(dir, "db.sqlite");
  let store = openStore(path);
  store.run(
    "INSERT INTO users(id,email,password_hash,profile,created_at) VALUES(?,?,?,?,?)",
    "id",
    "mail@example.com",
    "hash",
    "{}",
    "now",
  );
  store.close();
  store = openStore(path);
  assert.equal(store.get("SELECT email FROM users").email, "mail@example.com");
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

test("AI reviews receive private slides after the pitch and cannot add unlimited follow-ups", async (t) => {
  const calls = [];
  const f = await fixture(t, {
    ready: true,
    async reviewPitch(input) {
      calls.push(input);
      return {
        summary: "Test coach feedback",
        strengths: [],
        improvements: [],
        deckNotes: "Test slide note",
        questions: input.questions.map((q) => ({
          id: q.id,
          text: `Coach question: ${q.text}`,
        })),
      };
    },
    async reviewAnswer() {
      return {
        comment: "Test answer review",
        quote: "",
        followUp: "Which evidence supports this claim?",
      };
    },
  });
  const r = await f.register();
  let s = await newSession(f, r.cookie, { useAI: true });
  const upload = await f.request(`/api/sessions/${s.id}/assets`, {
    cookie: r.cookie,
    revision: s.revision,
    method: "POST",
    raw: Buffer.from("%PDF-1.4\n% fixture"),
    headers: { "Content-Type": "application/pdf", "X-File-Name": "deck.pdf" },
  });
  s = upload.data;
  async function action(name, data = {}, method = "POST") {
    const res = await f.request(`/api/sessions/${s.id}/${name}`, {
      cookie: r.cookie,
      revision: s.revision,
      method,
      data,
    });
    assert.equal(res.status, 200);
    s = res.data;
  }
  assert.equal(calls.length, 0);
  await action("start");
  await action(
    "draft",
    { phase: "review", pitch, answer: "", slide: 0, voiceEnabled: false },
    "PUT",
  );
  await action("analyze", { pitch });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].attachments[0].type, "input_file");
  assert.match(
    calls[0].attachments[0].file_data,
    /^data:application\/pdf;base64,/,
  );
  assert.match(s.state.questions[0].text, /^Coach question:/);
  await action("next");
  await action("answer", { step: 0, answer: pitch });
  const firstSpeaker = s.state.questions[0].speakerIndex;
  assert.equal(s.state.questions[1].speakerIndex, firstSpeaker);
  assert.equal(s.state.questions[1].parentId, s.state.questions[0].id);
  await action("next");
  await action("answer", { step: 1, answer: pitch });
  assert.equal(s.state.questions.filter((q) => q.followUp).length, 1);
  assert.equal(s.state.mentorAnswers.length, 2);
});

test("Imported version 3 feedback is validated and malformed records cannot break history", async (t) => {
  const { evaluateSession, createQuestions } =
    await import("../src/practice/engine.js");
  const { arenas } = await import("../src/game-data.js");
  const arena = arenas.find((a) => a.id === "family");
  const questions = createQuestions(pitch, arena, 1000);
  const answers = questions.map(() => pitch);
  const record = {
    ...evaluateSession({ pitch, questions, answers, arena }),
    id: "guest",
    date: new Date().toISOString(),
    startup: "Clinic",
    arenaId: arena.id,
    questions: questions.map((q) => q.text),
    answers,
    questionPlan: questions,
    pitchTranscript: pitch,
  };
  const f = await fixture(t),
    r = await f.register();
  const res = await f.request("/api/history/import", {
    cookie: r.cookie,
    method: "POST",
    data: { records: [record, { ...record, id: "bad", dimensions: {} }] },
  });
  assert.equal(res.status, 200);
  assert.equal(res.data.count, 1);
  assert.equal(res.data.history[0].scoringVersion, 3);
  assert.equal(res.data.history[0].dimensions.length, 5);
});
