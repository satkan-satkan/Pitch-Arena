import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { communityFixture } from "./community-fixture.mjs";

let time = Date.now();
const inbox = [];
const f = await communityFixture({
  verified: false,
  accountClock: () => time,
  mailer: {
    ready: true,
    send: async (message) => {
      inbox.push(message);
    },
  },
});
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1050 },
  reducedMotion: "reduce",
});
const page = await context.newPage(),
  checks = [],
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const check = (name, ok) => {
  assert.ok(ok, name);
  checks.push(name);
  console.log("PASS", name);
};
const button = (name, p = page) => p.getByRole("button", { name, exact: true });
const field = (name, p = page) => p.getByLabel(name, { exact: true });
const password = "community test password 123",
  nextPassword = "updated browser password 456",
  finalPassword = "final browser password 789";
const mailLink = (message) => {
  const url = new URL(message.text.match(/https:\/\/[^\s]+/)[0]);
  return f.origin + url.pathname + url.hash;
};
const cookie = async (c) => {
  const v = (await c.cookies()).find((v) => v.name === "pa_session");
  return v ? `${v.name}=${v.value}` : "";
};
async function signIn(p, pass) {
  await field("Email", p).fill("auth-browser@example.com");
  await field("Пароль · от 12 символов", p).fill(pass);
  await p
    .getByRole("dialog")
    .getByRole("button", { name: "Войти", exact: true })
    .click();
}
try {
  mkdirSync("artifacts", { recursive: true });
  await page.goto(f.origin);
  await button("Занять сцену").click();
  await field("Имя").fill("Test Founder");
  await field("Email").fill("auth-browser@example.com");
  await field("Пароль · от 12 символов").fill(password);
  await button("Зарегистрироваться").click();
  await page
    .getByRole("heading", { name: "Мои проекты", exact: true })
    .waitFor();
  await f.drainMail();
  check(
    "Registration queues a verification email",
    inbox.length === 1 && inbox[0].to === "auth-browser@example.com",
  );
  await button("Close").click();
  await page
    .locator(".nav-item")
    .filter({ hasText: "Стартапы и команды" })
    .click();
  await page
    .getByText("Приглашения ждут подтверждения почты", { exact: true })
    .waitFor();
  check(
    "Unverified founders can still create their startup",
    await button("Новый стартап").isEnabled(),
  );
  const saved = await f.request("/projects", {
    method: "POST",
    cookie: await cookie(context),
    data: { name: "Preserved startup" },
  });
  check(
    "Private project can be saved before verification",
    saved.status === 201,
  );

  const secondContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const second = await secondContext.newPage();
  second.on("pageerror", (e) => errors.push(e.message));
  await second.goto(mailLink(inbox[0]));
  await button("Войти", second).waitFor();
  check("Email link is removed from address bar", !new URL(second.url()).hash);
  check(
    "Opening a link does not consume it",
    (await f.store.all("SELECT * FROM account_tokens")).length === 1,
  );
  check(
    "Verification page fits mobile width",
    await second.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await button("Войти", second).click();
  await signIn(second, password);
  await second.getByRole("dialog").waitFor({ state: "hidden" });
  await second.screenshot({
    path: "artifacts/v20-verify-mobile.png",
    fullPage: true,
  });
  await button("Подтвердить адрес", second).click();
  await second
    .getByText("Адрес подтверждён. Теперь доступны приглашения в команды.", {
      exact: true,
    })
    .waitFor();
  check("Verification works after signing in on another device", true);
  await page.reload();
  await button("Мой профиль").click();
  await page.locator(".account-security .email-verified").waitFor();
  check("Verified status is shown in the account profile", true);

  await button("Аккаунт").click();
  await button("Выйти из аккаунта").click();
  await button("Войти").click();
  await button("Забыли пароль?").click();
  await field("Email").fill("auth-browser@example.com");
  time += 61000;
  await button("Получить ссылку").click();
  await page
    .getByText(
      "Запрос принят. Если аккаунт существует и доступен, письмо придёт на указанный адрес. Проверь также спам.",
      { exact: true },
    )
    .waitFor();
  check(
    "Resend is disabled during cooldown",
    await page.getByRole("button", { name: /Повторить через/ }).isDisabled(),
  );
  await page
    .getByRole("dialog")
    .screenshot({ path: "artifacts/v20-recovery-request.png" });
  await f.drainMail();
  const reset = mailLink(inbox.at(-1));
  await page.goto(reset);
  await field("Новый пароль · от 12 символов").fill(nextPassword);
  await field("Повтори новый пароль").fill("different password 999");
  await button("Сохранить новый пароль").click();
  await page.getByText("Пароли не совпадают.", { exact: true }).waitFor();
  check(
    "Mismatched passwords do not submit a reset",
    (await f.store.all("SELECT * FROM account_tokens WHERE purpose='reset'"))
      .length === 1,
  );
  await field("Повтори новый пароль").fill(nextPassword);
  await button("Сохранить новый пароль").click();
  await page
    .getByText(
      "Пароль обновлён. Старые сеансы закрыты. Войди с новым паролем.",
      { exact: true },
    )
    .waitFor();
  check(
    "Reset signs out the other device",
    (await f.request("/bootstrap", { cookie: await cookie(secondContext) }))
      .data.user === null,
  );
  await button("Войти").click();
  await signIn(page, nextPassword);
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.locator(".top-avatar").waitFor();
  check(
    "New password signs in and preserves the project",
    (
      await f.request("/bootstrap", { cookie: await cookie(context) })
    ).data.projects.some((p) => p.id === saved.data.id),
  );
  await button("Мой профиль").click();
  await field("Текущий пароль").fill("incorrect password 999");
  await field("Новый пароль · от 12 символов").fill(finalPassword);
  await field("Повтори новый пароль").fill(finalPassword);
  await button("Сменить пароль").click();
  await page.locator(".account-security [role=alert]").waitFor();
  await field("Текущий пароль").fill(nextPassword);
  await button("Сменить пароль").click();
  await page
    .getByText("Пароль изменён. Все остальные устройства вышли из аккаунта.", {
      exact: true,
    })
    .waitFor();
  check(
    "Password change rejects wrong credentials and accepts the current one",
    true,
  );
  await button("Switch to English").click();
  await page
    .locator(".account-security")
    .screenshot({ path: "artifacts/v20-account-security.png" });
  check(
    "Account security supports English",
    await page
      .getByRole("heading", { name: "Account security", exact: true })
      .isVisible(),
  );
  const lastCookie = await cookie(context);
  await button("Sign out everywhere").click();
  await page.locator(".account-security").waitFor({ state: "hidden" });
  check(
    "Sign out everywhere invalidates the current cookie",
    (await f.request("/bootstrap", { cookie: lastCookie })).data.user === null,
  );
  await page.goto(reset);
  await field("New password · at least 12 characters").fill(nextPassword);
  await field("Confirm new password").fill(nextPassword);
  await button("Save new password").click();
  await page
    .getByText(
      "This link has expired or was already used. Request a new email.",
      { exact: true },
    )
    .waitFor();
  check(
    "Used email links show a recovery action",
    await button("Open account / request a new link").isVisible(),
  );
  await secondContext.close();
  const off = await communityFixture();
  try {
    await page.goto(off.origin + "/play");
    await button("Switch to English").click();
    await button("Sign in").click();
    await button("Forgot password?").click();
    check(
      "Missing mail configuration disables delivery instead of pretending to send",
      await button("Send reset link").isDisabled(),
    );
    check(
      "Mail-off has an explicit explanation",
      await page
        .getByText(
          "Email delivery is not configured yet. Password reset will be available once it is connected.",
          { exact: true },
        )
        .isVisible(),
    );
  } finally {
    await off.close();
  }
  check("No browser errors", errors.length === 0);
  writeFileSync(
    "artifacts/v20-account-email-verification.json",
    JSON.stringify({ checks, errors }, null, 2) + "\n",
  );
} finally {
  await browser.close();
  await f.close();
}
