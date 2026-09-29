import { randomBytes } from "node:crypto";
import { z } from "zod";
import { tokenHash, hashPassword, checkPassword, createLogin } from "./auth.js";

const fail = (status, message) => {
  throw Object.assign(new Error(message), { status });
};
const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));
const languageSchema = z.enum(["ru", "en"]).default("ru");
const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
const passwordSchema = z.string().min(12).max(128);
export const expiredCookie = (secure) =>
  `pa_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure ? "; Secure" : ""}`;

export function createAccountEmail({
  store,
  mailer,
  appOrigin,
  secureCookies,
  now = Date.now,
  dailyLimit = 250,
}) {
  const base = new URL(appOrigin);
  if (
    base.username ||
    base.password ||
    base.pathname !== "/" ||
    base.search ||
    base.hash ||
    (base.protocol !== "https:" &&
      !(
        base.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname)
      ))
  )
    throw new Error(
      "APP_ORIGIN must be an HTTPS origin (HTTP is allowed only on localhost)",
    );
  const pending = new Set();
  const enqueue = (job) => {
    const task = Promise.resolve()
      .then(job)
      .catch(() => {
        console.error(
          "Account email delivery failed; retry is available after the cooldown",
        );
      })
      .finally(() => pending.delete(task));
    pending.add(task);
  };
  async function reserve(email, ip) {
    if (!mailer.ready) fail(503, "MAIL_UNAVAILABLE");
    if (pending.size >= 30) fail(503, "MAIL_UNAVAILABLE");
    await store.transaction(async () => {
      await store.lock("auth-mail:limits");
      await store.run("DELETE FROM auth_mail_limits WHERE expires<=?", now());
      const buckets = [
        [`cooldown:${tokenHash(email)}`, 1, 60000],
        [`recipient:${tokenHash(email)}`, 5, 3600000],
        [`ip:${tokenHash(ip)}`, 20, 3600000],
        ["global", dailyLimit, 86400000],
      ];
      for (const [key, limit, period] of buckets) {
        const row = await store.get(
          "SELECT count FROM auth_mail_limits WHERE bucket=?",
          key,
        );
        if (row && row.count >= limit) fail(429, "RATE_LIMITED");
        await store.run(
          "INSERT INTO auth_mail_limits VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=auth_mail_limits.count+1",
          key,
          now() + period,
        );
      }
    });
  }
  async function deliver(email, purpose, language) {
    let outgoing;
    await store.transaction(async () => {
      const account = await store.get(
        "SELECT * FROM users WHERE email=?",
        email,
      );
      if (!account) return;
      await store.lock(`auth-user:${account.id}`);
      const user = await store.get(
        "SELECT * FROM users WHERE id=?",
        account.id,
      );
      if (
        user?.status !== "active" ||
        (purpose === "verify" && user.email_verified_at)
      )
        return;
      const token = randomBytes(32).toString("hex");
      const hash = tokenHash(token);
      await store.run("DELETE FROM account_tokens WHERE expires<=?", now());
      await store.run(
        "DELETE FROM account_tokens WHERE user_id=? AND purpose=?",
        user.id,
        purpose,
      );
      await store.run(
        "INSERT INTO account_tokens VALUES(?,?,?,?)",
        hash,
        user.id,
        purpose,
        now() + (purpose === "verify" ? 86400000 : 1800000),
      );
      const url = new URL(
        purpose === "verify" ? "/auth/verify-email" : "/auth/reset-password",
        base,
      );
      // Fragment is not sent to the HTTP server or as a Referer.
      url.hash = `token=${token}`;
      const verify = purpose === "verify",
        en = language === "en";
      outgoing = {
        hash,
        to: user.email,
        subject: en
          ? verify
            ? "Confirm your Pitch Arena email"
            : "Reset your Pitch Arena password"
          : verify
            ? "Подтверди почту в Pitch Arena"
            : "Сброс пароля Pitch Arena",
        text: en
          ? `${verify ? "Sign in to the account you created, then confirm your email" : "Set a new password"}:\n${url.href}\n\nThis one-time link expires in ${verify ? "24 hours" : "30 minutes"}. ${verify ? "Confirm only if you created this account." : "After reset, all existing sessions will be signed out."} If you did not request this, ignore this email.\nPitch Arena`
          : `${verify ? "Войди в созданный тобой аккаунт и подтверди почту" : "Установи новый пароль"}:\n${url.href}\n\nОдноразовая ссылка действует ${verify ? "24 часа" : "30 минут"}. ${verify ? "Подтверждай только аккаунт, который создал сам." : "После сброса все прежние сеансы входа будут закрыты."} Если ты не запрашивал письмо, просто проигнорируй его.\nPitch Arena`,
      };
    });
    if (!outgoing) return;
    try {
      await mailer.send(outgoing);
    } catch (error) {
      await store.run(
        "DELETE FROM account_tokens WHERE token_hash=?",
        outgoing.hash,
      );
      throw error;
    }
  }
  async function request(email, purpose, language, ip) {
    await reserve(email, ip);
    // Same response/timing path for known, unknown and blocked addresses:
    // account lookup and provider latency happen after the request is accepted.
    enqueue(() => deliver(email, purpose, language));
    return { ok: true, retryAfter: 60 };
  }
  const withToken = async (token, purpose, action) =>
    store.transaction(async () => {
      const hash = tokenHash(token);
      let row = await store.get(
        "SELECT * FROM account_tokens WHERE token_hash=? AND purpose=?",
        hash,
        purpose,
      );
      if (!row) fail(400, "INVALID_AUTH_LINK");
      await store.lock(`auth-user:${row.user_id}`);
      row = await store.get(
        "SELECT * FROM account_tokens WHERE token_hash=? AND purpose=? AND expires>?",
        hash,
        purpose,
        now(),
      );
      if (!row) fail(400, "INVALID_AUTH_LINK");
      const user = await store.get(
        "SELECT * FROM users WHERE id=?",
        row.user_id,
      );
      if (user?.status !== "active") fail(400, "INVALID_AUTH_LINK");
      await action(user);
      await store.run("DELETE FROM account_tokens WHERE token_hash=?", hash);
      return { ok: true };
    });
  return {
    ready: mailer.ready,
    async drain() {
      while (pending.size) await Promise.all([...pending]);
    },
    async onRegister(user, language, ip) {
      if (!mailer.ready) return;
      // Registration must not fail after the account has been created.
      try {
        await request(user.email, "verify", language, ip);
      } catch {
        /* Resend remains available. */
      }
    },
    async handle(path, input, user, ip) {
      if (path === "/api/auth/forgot-password") {
        const data = z
          .object({ email: emailSchema, language: languageSchema })
          .strict()
          .parse(input);
        return request(data.email, "reset", data.language, ip);
      }
      if (path === "/api/auth/resend-verification") {
        if (!user) fail(401, "LOGIN_REQUIRED");
        const data = z
          .object({ language: languageSchema })
          .strict()
          .parse(input);
        if (user.email_verified_at) return { ok: true, verified: true };
        return request(user.email, "verify", data.language, ip);
      }
      if (path === "/api/auth/verify-email") {
        if (!user) fail(401, "LOGIN_REQUIRED");
        const { token } = z
          .object({ token: tokenSchema })
          .strict()
          .parse(input);
        return withToken(token, "verify", async (account) => {
          if (account.id !== user.id)
            fail(403, "VERIFICATION_ACCOUNT_REQUIRED");
          await store.run(
            "UPDATE users SET email_verified_at=? WHERE id=?",
            new Date(now()).toISOString(),
            account.id,
          );
        });
      }
      if (path === "/api/auth/reset-password") {
        const { token, password } = z
          .object({ token: tokenSchema, password: passwordSchema })
          .strict()
          .parse(input);
        const hash = await hashPassword(password);
        return withToken(token, "reset", async (account) => {
          await store.run(
            "UPDATE users SET password_hash=?,email_verified_at=COALESCE(email_verified_at,?) WHERE id=?",
            hash,
            new Date(now()).toISOString(),
            account.id,
          );
          await store.run("DELETE FROM logins WHERE user_id=?", account.id);
          await store.run(
            "DELETE FROM account_tokens WHERE user_id=?",
            account.id,
          );
        });
      }
      if (!user) fail(401, "LOGIN_REQUIRED");
      if (path === "/api/auth/logout-all") {
        return store.transaction(async () => {
          await store.lock(`auth-user:${user.id}`);
          await store.run("DELETE FROM logins WHERE user_id=?", user.id);
          return { ok: true };
        });
      }
      if (path === "/api/auth/change-password") {
        const data = z
          .object({ currentPassword: passwordSchema, password: passwordSchema })
          .strict()
          .parse(input);
        return store.transaction(async () => {
          await store.lock(`auth-user:${user.id}`);
          const current = await store.get(
            "SELECT * FROM users WHERE id=?",
            user.id,
          );
          if (
            current?.status !== "active" ||
            !(await checkPassword(data.currentPassword, current.password_hash))
          )
            fail(401, "INVALID_CREDENTIALS");
          await store.run(
            "UPDATE users SET password_hash=? WHERE id=?",
            await hashPassword(data.password),
            user.id,
          );
          await store.run("DELETE FROM logins WHERE user_id=?", user.id);
          await store.run(
            "DELETE FROM account_tokens WHERE user_id=?",
            user.id,
          );
          return {
            ok: true,
            cookie: await createLogin(store, user.id, secureCookies),
          };
        });
      }
      fail(404, "NOT_FOUND");
    },
  };
}
