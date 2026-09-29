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
const context = await browser.newContext({
  viewport: { width: 1440, height: 1050 },
  reducedMotion: "reduce",
});
await context.addInitScript(() => {
  window.micRequests = 0;
  if (navigator.mediaDevices)
    navigator.mediaDevices.getUserMedia = async () => {
      window.micRequests++;
      throw new Error("No microphone requested by this test");
    };
});
const page = await context.newPage(),
  checks = [],
  errors = [];
page.on("pageerror", (e) => {
  errors.push(e.message);
  console.log("BROWSER ERROR", e.message);
});
const check = (name, v) => {
  assert.ok(v, name);
  checks.push(name);
  console.log("PASS", name);
};
const button = (name) => page.getByRole("button", { name, exact: true });
const state = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem("pa-guide:guest")));
const mood = () =>
  page
    .locator(".game-conversation .guide-message")
    .getAttribute("data-emotion");
try {
  await page.goto(f.origin);
  await page.locator(".experience-window").waitFor();
  const tabs = page.getByRole("tablist", { name: "Этапы тренировки" });
  await tabs.getByRole("tab").first().focus();
  await page.keyboard.press("ArrowRight");
  check(
    "Landing preview supports keyboard tabs",
    (await tabs.getByRole("tab").nth(1).getAttribute("aria-selected")) ===
      "true",
  );
  mkdirSync("artifacts", { recursive: true });
  await page.screenshot({ path: "artifacts/v10-landing.png", fullPage: true });
  await button("Познакомиться с Искрой").click();
  await page.getByRole("dialog", { name: "Знакомство с Искрой" }).waitFor();
  check(
    "Guide opens an optional introduction without starting a session",
    (await state()).status === "learning" &&
      (await page.evaluate(() => window.micRequests)) === 0,
  );
  await page.screenshot({ path: "artifacts/v10-guide-intro.png" });
  await button("Дальше").click();
  await button("Дальше").click();
  check(
    "Reading introduction creates no XP",
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("pa-history")).length === 0,
    ),
  );
  await button("Подготовить первый питч").click();
  await page
    .getByLabel("Название стартапа", { exact: true })
    .fill("First Spark");
  check(
    "Guided setup defaults to one minute and silent questions",
    (await page.getByLabel("Своя длительность в секундах").inputValue()) ===
      "60" &&
      !(await page
        .getByLabel("Озвучивать вопросы нейтральным голосом")
        .isChecked()),
  );
  await button("Войти на арену").click();
  await page.locator(".phase-ready").waitFor();
  check(
    "Preparing first mission is not counted as completed",
    (await state()).status === "practicing",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await button("Начать текстом").click();
  check("Guide listens during the pitch", (await mood()) === "listening");
  check(
    "Guide stays still while the player pitches",
    await page
      .locator(".game-conversation .guide-portrait")
      .evaluate(
        (el) =>
          el.dataset.quiet === "true" &&
          getComputedStyle(el).transform === "none",
      ),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page
    .locator("#pitch-transcript")
    .fill(
      "У меня пока только идея и я хочу попробовать рассказать о ней людям.",
    );
  await button("Закончить питч").click();
  await page.locator(".phase-review").waitFor();
  check("Guide thinks during transcript review", (await mood()) === "thinking");
  await page.reload();
  await button("Продолжить питч").click();
  await page.locator(".phase-review").waitFor();
  check(
    "Tutorial identity and phase survive reload",
    (await state()).status === "practicing" && (await mood()) === "thinking",
  );
  await button("Разобрать мой питч").click();
  await page.locator(".phase-analysis").waitFor();
  await button("Перейти к вопросам").click();
  let count = 0;
  while (await page.locator(".phase-qa").count()) {
    assert.ok(count++ < 7);
    await page
      .locator("#pitch-answer")
      .fill("Пока я этого не знаю. Обсужу идею с пользователями.");
    await button("Разобрать ответ").click();
    await page.locator(".answer-review").waitFor();
    check("Guide supports after answer feedback", (await mood()) === "support");
    await page.locator(".answer-review .button.dark").click();
  }
  await page
    .getByRole("heading", { name: "Раунд завершён", exact: true })
    .waitFor();
  check(
    "Only a finished practice completes the introduction",
    (await state()).status === "completed",
  );
  check(
    "Low score receives encouragement rather than exaggerated celebration",
    (await page
      .locator(".modal .guide-message")
      .getAttribute("data-emotion")) === "support",
  );
  check(
    "Guide never requests microphone access in text mode",
    await page.evaluate(() => window.micRequests === 0),
  );
  await page.screenshot({ path: "artifacts/v10-guide-result.png" });
  await button("Close").click();
  await page
    .locator(".nav-item")
    .filter({ hasText: "Комната основателя" })
    .click();
  await button("Гид Искра").click();
  await button("Отключить подсказки").click();
  await button("Close").click();
  await page.reload();
  check(
    "Guide opt-out survives reload",
    (await page.locator(".guide-home").count()) === 0 &&
      (await state()).enabled === false,
  );
  await button("Войти").click();
  await button("Создать новый аккаунт").click();
  await page.getByLabel("Имя", { exact: true }).fill("Guide Founder");
  await page.getByLabel("Email", { exact: true }).fill("guide@example.com");
  await page
    .getByLabel("Пароль · от 12 символов", { exact: true })
    .fill("guide browser password 123");
  await button("Зарегистрироваться").click();
  await page
    .getByRole("heading", { name: "Мои проекты", exact: true })
    .waitFor();
  await button("Close").click();
  await button("Гид Искра").click();
  check(
    "New account has separate onboarding preferences",
    await button("Отключить подсказки").isVisible(),
  );
  await button("Дальше").click();
  await button("Дальше").click();
  await button("Подготовить первый питч").click();
  await button("Войти на арену").click();
  await page.locator(".phase-ready").waitFor();
  check(
    "Account draft stores tutorial marker on server",
    await page.evaluate(async () => {
      const r = await fetch("/api/bootstrap").then((r) => r.json());
      return r.draft.config.tutorial === true;
    }),
  );
  await page.goto(f.origin + "/play");
  await page.locator(".studio-guide-link").waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "artifacts/v10-guide-mobile.png",
    fullPage: true,
  });
  check(
    "Guide home fits mobile width",
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.goto(f.origin);
  await page.locator(".experience-window").waitFor();
  check(
    "Interactive landing fits mobile width",
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await button("Switch to English").click();
  await button("Meet Iskra").click();
  await page.getByRole("dialog", { name: "Meet Iskra", exact: true }).waitFor();
  check(
    "Introduction supports English",
    await page
      .getByRole("heading", { name: "Your first stage", exact: true })
      .isVisible(),
  );
  check("No browser runtime errors", errors.length === 0);
  writeFileSync(
    "artifacts/v10-verification.json",
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
