import test from "node:test";
import assert from "node:assert/strict";
import { communityFixture } from "./community-fixture.mjs";
import { tokenHash } from "../server/auth.js";
import { createAccountEmail } from "../server/account-email.js";

const oldPassword = "community test password 123",
  newPassword = "new secure testing password 456";
const tokenOf = (mail) =>
  new URL(mail.text.match(/https:\/\/[^\s]+/)[0]).hash.slice(7);
async function setup(t, overrides = {}) {
  let time = Date.now();
  const inbox = [];
  const mailer = {
    ready: true,
    send: async (message) => {
      inbox.push(message);
    },
    ...overrides,
  };
  const f = await communityFixture({
    mailer,
    verified: false,
    accountClock: () => time,
  });
  t.after(f.close);
  return {
    ...f,
    inbox,
    tick: (ms = 61000) => {
      time += ms;
    },
  };
}
const post = (f, path, data, cookie) =>
  f.request(`/auth/${path}`, { method: "POST", data, cookie });
const login = (f, email, password = oldPassword) =>
  post(f, "login", { email, password });

test("Mail cooldowns survive service recreation and unknown recipients use the same daily budget", async (t) => {
  const f = await setup(t);
  const options = {
    store: f.store,
    appOrigin: "https://arena.example.com",
    mailer: { ready: true, send: async () => {} },
    dailyLimit: 2,
  };
  const first = createAccountEmail(options);
  await first.handle(
    "/api/auth/forgot-password",
    { email: "one@example.com" },
    null,
    "test-ip",
  );
  await first.drain();
  const restarted = createAccountEmail(options);
  await assert.rejects(
    restarted.handle(
      "/api/auth/forgot-password",
      { email: "one@example.com" },
      null,
      "test-ip",
    ),
    { status: 429 },
  );
  await restarted.handle(
    "/api/auth/forgot-password",
    { email: "two@example.com" },
    null,
    "other-ip",
  );
  await restarted.drain();
  await assert.rejects(
    restarted.handle(
      "/api/auth/forgot-password",
      { email: "three@example.com" },
      null,
      "third-ip",
    ),
    { status: 429 },
  );
});

test("A concurrent old-password login cannot survive a completed reset", async (t) => {
  const f = await setup(t);
  await f.register("race@example.com");
  await f.drainMail();
  f.tick();
  await post(f, "forgot-password", { email: "race@example.com" });
  await f.drainMail();
  const token = tokenOf(f.inbox.at(-1));
  const [signed, reset] = await Promise.all([
    login(f, "race@example.com"),
    post(f, "reset-password", { token, password: newPassword }),
  ]);
  assert.equal(reset.status, 200);
  assert.ok([200, 401].includes(signed.status));
  if (signed.status === 200)
    assert.equal(
      (await f.request("/bootstrap", { cookie: signed.cookie })).data.user,
      null,
    );
  assert.equal((await login(f, "race@example.com", newPassword)).status, 200);
});
test("Verification links are private, bound to the signed-in account, expiring and single-use", async (t) => {
  const f = await setup(t),
    owner = await f.register("owner@example.com"),
    stranger = await f.register("stranger@example.com");
  await f.drainMail();
  const token = tokenOf(f.inbox.find((m) => m.to === "owner@example.com"));
  assert.equal(owner.data.user.emailVerified, false);
  assert.ok(!JSON.stringify(owner.data).includes(token));
  const rows = await f.store.all("SELECT * FROM account_tokens");
  assert.ok(rows.some((r) => r.token_hash === tokenHash(token)));
  assert.ok(!JSON.stringify(rows).includes(token));
  assert.equal((await post(f, "verify-email", { token })).status, 401);
  assert.equal(
    (await post(f, "verify-email", { token }, stranger.cookie)).status,
    403,
  );
  // Opening the email (including link scanners) never consumes it.
  assert.equal((await f.store.all("SELECT * FROM account_tokens")).length, 2);
  const [a, b] = await Promise.all([
    post(f, "verify-email", { token }, owner.cookie),
    post(f, "verify-email", { token }, owner.cookie),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [200, 400]);
  assert.equal(
    (await f.request("/bootstrap", { cookie: owner.cookie })).data.user
      .emailVerified,
    true,
  );
  f.tick(86400001);
  assert.equal(
    (
      await post(
        f,
        "verify-email",
        {
          token: tokenOf(f.inbox.find((m) => m.to === "stranger@example.com")),
        },
        stranger.cookie,
      )
    ).data.error,
    "INVALID_AUTH_LINK",
  );
});
test("Unverified email cannot disclose, accept or decline invitations", async (t) => {
  const f = await setup(t),
    owner = await f.register("owner@example.com"),
    invitee = await f.register("invitee@example.com");
  const team = (
    await f.request("/workspace/teams", {
      method: "POST",
      cookie: owner.cookie,
      data: { name: "Private team", description: "", links: {} },
    })
  ).data.id;
  const invitation = await f.request(`/workspace/teams/${team}/invitations`, {
    method: "POST",
    cookie: owner.cookie,
    data: { email: "invitee@example.com", role: "member" },
  });
  assert.equal(invitation.status, 200);
  assert.deepEqual(
    (await f.request("/workspace/invitations", { cookie: invitee.cookie }))
      .data,
    { items: [], verificationRequired: true },
  );
  for (const action of ["accept", "decline"])
    assert.equal(
      (
        await f.request(
          `/workspace/invitations/${invitation.data.id}/${action}`,
          { method: "POST", cookie: invitee.cookie, data: {} },
        )
      ).data.error,
      "EMAIL_VERIFICATION_REQUIRED",
    );
  await f.drainMail();
  await post(
    f,
    "verify-email",
    { token: tokenOf(f.inbox.find((m) => m.to === "invitee@example.com")) },
    invitee.cookie,
  );
  assert.equal(
    (await f.request("/workspace/invitations", { cookie: invitee.cookie })).data
      .items.length,
    1,
  );
  assert.equal(
    (
      await f.request(`/workspace/invitations/${invitation.data.id}/accept`, {
        method: "POST",
        cookie: invitee.cookie,
        data: {},
      })
    ).status,
    200,
  );
});
test("Reset has uniform responses, rotates links, revokes all logins and preserves data", async (t) => {
  const f = await setup(t),
    owner = await f.register("owner@example.com");
  const another = await login(f, "owner@example.com");
  const project = (
    await f.request("/projects", {
      method: "POST",
      cookie: owner.cookie,
      data: { name: "Keep my project" },
    })
  ).data;
  await f.drainMail();
  f.tick();
  const known = await post(f, "forgot-password", {
    email: " OWNER@example.com ",
    language: "en",
  });
  const unknown = await post(f, "forgot-password", {
    email: "unknown@example.com",
    language: "en",
  });
  assert.deepEqual(
    { status: known.status, data: known.data },
    { status: unknown.status, data: unknown.data },
  );
  assert.equal(known.status, 200);
  await f.drainMail();
  const first = tokenOf(f.inbox.at(-1));
  assert.equal(f.inbox.at(-1).subject, "Reset your Pitch Arena password");
  assert.equal(
    (await post(f, "forgot-password", { email: "owner@example.com" })).status,
    429,
  );
  f.tick();
  await post(f, "forgot-password", { email: "owner@example.com" });
  await f.drainMail();
  const token = tokenOf(f.inbox.at(-1));
  assert.notEqual(first, token);
  assert.equal(
    (await post(f, "reset-password", { token: first, password: newPassword }))
      .status,
    400,
  );
  assert.equal(
    (await post(f, "reset-password", { token, password: "short" })).status,
    400,
  );
  const result = await post(f, "reset-password", {
    token,
    password: newPassword,
  });
  assert.equal(result.status, 200);
  assert.equal(result.cookie, "pa_session=");
  assert.equal(
    (await post(f, "reset-password", { token, password: newPassword })).status,
    400,
  );
  assert.equal(
    (await f.request("/bootstrap", { cookie: owner.cookie })).data.user,
    null,
  );
  assert.equal(
    (await f.request("/bootstrap", { cookie: another.cookie })).data.user,
    null,
  );
  assert.equal((await login(f, "owner@example.com")).status, 401);
  const signed = await login(f, "owner@example.com", newPassword);
  assert.equal(signed.status, 200);
  assert.equal(signed.data.user.emailVerified, true);
  assert.equal(
    (await f.request("/bootstrap", { cookie: signed.cookie })).data.projects[0]
      .id,
    project.id,
  );
});
test("Blocked accounts and expired reset links cannot regain access", async (t) => {
  const f = await setup(t),
    owner = await f.register("blocked@example.com");
  await f.drainMail();
  f.tick();
  await post(f, "forgot-password", { email: "blocked@example.com" });
  await f.drainMail();
  const token = tokenOf(f.inbox.at(-1));
  f.tick(1800001);
  assert.equal(
    (await post(f, "reset-password", { token, password: newPassword })).data
      .error,
    "INVALID_AUTH_LINK",
  );
  await post(f, "forgot-password", { email: "blocked@example.com" });
  await f.drainMail();
  const newer = tokenOf(f.inbox.at(-1));
  await f.store.run(
    "UPDATE users SET status='blocked' WHERE id=?",
    owner.data.user.id,
  );
  assert.equal(
    (await post(f, "reset-password", { token: newer, password: newPassword }))
      .status,
    400,
  );
  const before = f.inbox.length;
  f.tick();
  assert.equal(
    (await post(f, "forgot-password", { email: "blocked@example.com" })).status,
    200,
  );
  await f.drainMail();
  assert.equal(f.inbox.length, before);
});
test("Password changes require current credentials, rotate the current session and logout-all revokes it", async (t) => {
  const f = await setup(t),
    owner = await f.register("owner@example.com"),
    other = await login(f, "owner@example.com");
  assert.equal(
    (
      await post(
        f,
        "change-password",
        { currentPassword: "wrong password 123", password: newPassword },
        owner.cookie,
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await post(f, "change-password", {
        currentPassword: oldPassword,
        password: newPassword,
      })
    ).status,
    401,
  );
  const changed = await post(
    f,
    "change-password",
    { currentPassword: oldPassword, password: newPassword },
    owner.cookie,
  );
  assert.equal(changed.status, 200);
  assert.ok(changed.cookie);
  assert.equal(changed.data.cookie, undefined);
  for (const cookie of [owner.cookie, other.cookie])
    assert.equal((await f.request("/bootstrap", { cookie })).data.user, null);
  assert.ok(
    (await f.request("/bootstrap", { cookie: changed.cookie })).data.user,
  );
  await post(f, "logout-all", {}, changed.cookie);
  assert.equal(
    (await f.request("/bootstrap", { cookie: changed.cookie })).data.user,
    null,
  );
});
test("Mail-off is explicit; failed delivery removes its token and never exposes provider details", async (t) => {
  const f = await setup(t, { ready: false });
  await f.register("owner@example.com");
  assert.equal((await f.request("/bootstrap")).data.mailReady, false);
  for (const email of ["owner@example.com", "unknown@example.com"])
    assert.equal(
      (await post(f, "forgot-password", { email })).data.error,
      "MAIL_UNAVAILABLE",
    );
  assert.equal((await f.store.all("SELECT * FROM account_tokens")).length, 0);
  const failed = await setup(t, {
    send: async () => {
      throw new Error("private provider failure");
    },
  });
  await failed.register("failure@example.com");
  await failed.drainMail();
  assert.equal(
    (await failed.store.all("SELECT * FROM account_tokens")).length,
    0,
  );
});
test("Provider latency does not reveal whether a reset recipient exists", async (t) => {
  let release;
  const gate = new Promise((r) => {
    release = r;
  });
  const f = await setup(t, { send: () => gate });
  try {
    const result = await Promise.race([
      f.register("slow@example.com"),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Request waited for email delivery")),
          3000,
        ),
      ),
    ]);
    assert.equal(result.status, 200);
    f.tick();
    const response = await Promise.race([
      post(f, "forgot-password", { email: "slow@example.com" }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Reset waited for email delivery")),
          3000,
        ),
      ),
    ]);
    assert.equal(response.status, 200);
  } finally {
    release();
    await f.drainMail();
  }
});
