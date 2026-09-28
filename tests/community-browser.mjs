import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { communityFixture } from "./community-fixture.mjs";
const f = await communityFixture();
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : {}),
});
const errors = [],
  checks = [];
const check = (name, value) => {
  assert.ok(value, name);
  checks.push(name);
  console.log("PASS", name);
};
const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    reducedMotion: "reduce",
  }),
  page = await context.newPage();
page.on("pageerror", (e) => {
  errors.push(e.message);
  console.log("BROWSER ERROR", e.message);
});
const button = (name, p = page) => p.getByRole("button", { name, exact: true });
const field = (name, p = page) => p.getByLabel(name, { exact: true });
async function login(p, email) {
  await p.goto(f.origin + "/play");
  await button("Войти", p).click();
  await field("Email", p).fill(email);
  await field("Пароль · от 12 символов", p).fill("community test password 123");
  await p
    .getByRole("dialog")
    .getByRole("button", { name: "Войти", exact: true })
    .click();
  await p.getByRole("heading", { name: "Мои проекты", exact: true }).waitFor();
  await button("Close", p).click();
}
try {
  await f.register("admin@example.com", true);
  await f.register("teammate@example.com");
  await page.goto(f.origin);
  await page.locator(".landing-hero").waitFor();
  check(
    "Root opens the public landing without a game sidebar",
    (await page.locator(".sidebar").count()) === 0,
  );
  mkdirSync("artifacts", { recursive: true });
  await page.screenshot({ path: "artifacts/v6-landing.png", fullPage: true });
  await button("Попробовать без регистрации").click();
  check(
    "Guest game has a separate URL",
    new URL(page.url()).pathname === "/play",
  );
  await page.goBack();
  await page.locator(".landing-hero").waitFor();
  await button("Начать свой путь").click();
  await page
    .getByRole("heading", { name: "Создать аккаунт", exact: true })
    .waitFor();
  await field("Имя").fill("Founder");
  await field("Email").fill("founder@example.com");
  await field("Пароль · от 12 символов").fill("community test password 123");
  await button("Зарегистрироваться").click();
  await page
    .getByRole("heading", { name: "Мои проекты", exact: true })
    .waitFor();
  await button("Close").click();
  check(
    "Landing registration creates an account and enters the game",
    new URL(page.url()).pathname === "/play",
  );
  await page
    .locator(".nav-item")
    .filter({ hasText: "Стартапы и команды" })
    .click();
  await button("Создать команду").click();
  await field("Название команды").fill("Orbit Founders");
  await field("О команде").fill("Мы создаём инструменты для основателей");
  await field("Telegram").fill("https://t.me/example");
  await button("Сохранить команду").click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await field("Email участника").fill("teammate@example.com");
  await button("Пригласить").click();
  await page.locator(".pending-invite").waitFor();
  check(
    "Team invitation is visibly pending rather than auto-joining",
    (await page.locator(".team-members li").count()) === 1,
  );
  await button("Новый стартап").click();
  await field("Название стартапа").fill("Orbit Studio");
  await field("Продукт одним предложением").fill(
    "Инструменты для независимых основателей",
  );
  await field("Описание продукта").fill(
    "Помогаем небольшим командам готовить презентации и показывать результаты своей работы.",
  );
  await field("Владелец карточки").selectOption({ label: "Orbit Founders" });
  await field("Website").fill("https://example.com");
  await field("GitHub").fill("https://github.com/example");
  await field("Выручка за месяц").fill("1200");
  await button("Сохранить черновик").click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByText("Orbit Studio", { exact: true }).waitFor();
  check(
    "Startup remains private until moderation",
    (await f.request("/startups")).data.total === 0,
  );
  await button("На проверку").click();
  await page.getByText("На проверке", { exact: true }).waitFor();
  const memberContext = await browser.newContext(),
    member = await memberContext.newPage();
  member.on("pageerror", (e) => errors.push(e.message));
  await login(member, "teammate@example.com");
  await member
    .locator(".nav-item")
    .filter({ hasText: "Стартапы и команды" })
    .click();
  await member.locator(".team-inbox").waitFor();
  await button("Принять", member).click();
  await member.getByText("Orbit Studio", { exact: true }).waitFor();
  check(
    "Accepted editor sees the shared listing",
    await button("Редактировать", member).isVisible(),
  );
  const adminContext = await browser.newContext(),
    admin = await adminContext.newPage();
  admin.on("pageerror", (e) => errors.push(e.message));
  await login(admin, "admin@example.com");
  await admin.locator(".nav-item").filter({ hasText: "Админка" }).click();
  await admin.getByText("PostgreSQL", { exact: true }).waitFor();
  await admin
    .locator(".admin-tabs")
    .getByRole("button", { name: "Стартапы", exact: true })
    .click();
  await button("Посмотреть карточку", admin).click();
  await field("Комментарий для основателя", admin).fill(
    "Описание и ссылки проверены",
  );
  await button("Сохранить решение", admin).click();
  await admin.getByRole("dialog").waitFor({ state: "hidden" });
  const publicContext = await browser.newContext({
      viewport: { width: 1440, height: 1050 },
    }),
    visitor = await publicContext.newPage();
  visitor.on("pageerror", (e) => errors.push(e.message));
  await visitor.goto(f.origin + "/startups");
  await visitor
    .getByRole("link", { name: "Orbit Studio", exact: true })
    .waitFor();
  check(
    "Admin approval makes a real listing public",
    (await f.request("/startups")).data.total === 1,
  );
  check(
    "Revenue is labelled founder reported",
    await visitor
      .getByText("Выручка / месяц · со слов основателя", { exact: true })
      .isVisible(),
  );
  await visitor.screenshot({
    path: "artifacts/v6-directory.png",
    fullPage: true,
  });
  await visitor
    .getByRole("link", { name: "Orbit Studio", exact: true })
    .click();
  await visitor.locator(".startup-detail").waitFor();
  const detailUrl = visitor.url();
  await visitor.reload();
  await visitor.locator(".startup-detail").waitFor();
  check(
    "Public startup links survive direct navigation and refresh",
    detailUrl.includes("/startups/") &&
      (await visitor
        .getByRole("link", { name: "GitHub", exact: true })
        .getAttribute("href")) === "https://github.com/example",
  );
  await page.reload();
  await page
    .locator(".nav-item")
    .filter({ hasText: "Стартапы и команды" })
    .click();
  await page.getByText("Опубликован", { exact: true }).waitFor();
  await button("Редактировать").click();
  await field("Название стартапа").fill("Private revision");
  await button("Сохранить черновик").click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  check(
    "Editing a published card preserves its approved public version",
    (await f.request("/startups")).data.items[0].name === "Orbit Studio",
  );
  await button("Снять с публикации / проверки").click();
  await page
    .getByText("Есть публичная версия", { exact: true })
    .waitFor({ state: "hidden" });
  check(
    "Owner can withdraw the public listing",
    (await f.request("/startups")).data.total === 0,
  );
  await page.screenshot({ path: "artifacts/v6-workspace.png", fullPage: true });
  await visitor.goto(f.origin);
  await visitor.setViewportSize({ width: 390, height: 844 });
  await visitor.locator(".landing-hero").waitFor();
  check(
    "Landing fits mobile width",
    await visitor.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await visitor.screenshot({
    path: "artifacts/v6-landing-mobile.png",
    fullPage: true,
  });
  await button("Switch to English", visitor).click();
  check(
    "Landing supports English",
    await visitor
      .getByRole("heading", {
        name: "Big ideas start with your voice.",
        exact: true,
      })
      .isVisible(),
  );
  await button("Explore the startup directory", visitor).click();
  await visitor
    .getByText("The first founder stories start here", { exact: true })
    .waitFor();
  check(
    "Public directory has an honest localized empty state",
    await visitor
      .getByText("Published: 0. Newest first.", { exact: true })
      .isVisible(),
  );
  check("No browser runtime errors", errors.length === 0);
  writeFileSync(
    "artifacts/v6-verification.json",
    JSON.stringify(
      { passed: checks.length, checks, errors, liveAI: false },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
  await f.close();
}
