import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createApp } from "../server/app.js";
import { openStore } from "../server/store.js";
const dir = mkdtempSync(join(tmpdir(), "pitch-browser-"));
const app = createApp({
  store: openStore(join(dir, "db.sqlite")),
  assetDir: join(dir, "assets"),
  mentor: { ready: false },
  secureCookies: false,
});
await new Promise((resolve) => app.server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${app.server.address().port}`;
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
const page = await context.newPage(),
  errors = [],
  checks = [];
page.on("pageerror", (error) => errors.push(error.message));
const check = (name, value) => {
  assert.ok(value, name);
  checks.push(name);
  console.log("PASS", name);
};
const pitch =
  "Клиники теряют часы на запись вручную. Наш сервис автоматизирует запись и отправляет напоминания. У нас 120 клиентов за месяц по данным аналитики. Клиники платят подписку 3000 рублей за месяц. Направим средства на разработку и найм. Планируем привлечь 200 клиентов за три месяца.";
const email = "browser@example.com",
  password = "safe testing password 123";
async function boot(p = page) {
  return p.evaluate(() => fetch("/api/bootstrap").then((r) => r.json()));
}
async function openArena(p = page) {
  await p.locator(".nav-item").filter({ hasText: "Карта и арены" }).click();
  await p
    .locator(".map-regions")
    .getByRole("button", { name: "СНГ", exact: true })
    .click();
  await p.getByRole("button", { name: /Москва, Россия ·/ }).click();
  await p
    .locator(".atlas-fund-list")
    .getByRole("button", { name: /Арена Единорогов/ })
    .click();
  await p
    .locator(".map-mission")
    .getByRole("button", { name: "На сцену", exact: true })
    .click();
}
async function signIn(p) {
  await p.getByRole("button", { name: "Войти", exact: true }).first().click();
  await p.getByLabel("Email", { exact: true }).fill(email);
  await p.getByLabel("Пароль · от 12 символов", { exact: true }).fill(password);
  await p
    .getByRole("dialog")
    .getByRole("button", { name: "Войти", exact: true })
    .click();
  await p.getByRole("heading", { name: "Мои проекты", exact: true }).waitFor();
}
try {
  await page.addInitScript(() => {
    if (!localStorage.getItem("pa-profile"))
      localStorage.setItem(
        "pa-profile",
        JSON.stringify({
          name: "Александр",
          startup: "Мой стартап",
          industry: "SaaS & AI",
          bio: "",
        }),
      );
  });
  let releaseBootstrap;
  const bootstrapGate = new Promise((resolve) => {
    releaseBootstrap = resolve;
  });
  await page.route("**/api/bootstrap", async (route) => {
    await bootstrapGate;
    await route.continue();
  });
  await page.goto(origin + "/play");
  await page.locator(".valley-hotspot").first().waitFor();
  check(
    "Pending sign-in never displays a fake account",
    (await page.locator(".account-entry").isDisabled()) &&
      (await page.locator(".top-avatar").count()) === 0 &&
      (await page.locator(".account-entry").textContent()).includes(
        "Проверяем вход",
      ),
  );
  releaseBootstrap();
  await page.getByRole("button", { name: "Войти", exact: true }).waitFor();
  check(
    "Existing local profile is clearly marked as a guest",
    (await page.locator(".profile-button strong").textContent()) ===
      "Гостевой режим" && (await page.locator(".top-avatar").count()) === 0,
  );
  check(
    "Guest profile data is preserved",
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("pa-profile")).name === "Александр",
    ),
  );
  check(
    "Music starts off without autoplay",
    await page.getByTestId("background-music").evaluate((a) => a.paused),
  );
  await page.getByRole("button", { name: "Настройки музыки" }).click();
  await page
    .getByRole("button", { name: "Включить музыку", exact: true })
    .click();
  await page.waitForFunction(() => {
    const a = document.querySelector('audio[data-testid="background-music"]');
    return !a.paused && a.currentTime > 0;
  });
  check(
    "Prepared MP3 decodes and plays after user action",
    await page
      .getByTestId("background-music")
      .evaluate((a) => a.duration > 0 && a.loop),
  );
  await page.getByLabel("Громкость", { exact: true }).fill("12");
  await page.getByRole("button", { name: "Настройки музыки" }).click();
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await page
    .getByRole("button", { name: "Создать новый аккаунт", exact: true })
    .click();
  await page.getByLabel("Имя", { exact: true }).fill("Тестовый основатель");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByLabel("Пароль · от 12 символов", { exact: true })
    .fill(password);
  await page
    .getByRole("button", { name: "Зарегистрироваться", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Мои проекты", exact: true })
    .waitFor();
  check("Account registration updates UI", (await boot()).user.email === email);
  check(
    "Signed-in user sees account controls and their own identity",
    (await page.locator(".account-entry").textContent()) === "Аккаунт" &&
      (await page.locator(".profile-button strong").textContent()) ===
        "Тестовый основатель" &&
      (await page.locator(".top-avatar").count()) === 1,
  );
  await page.getByLabel("Новый проект", { exact: true }).fill("Clinic Cloud");
  await page
    .getByRole("button", { name: "Создать проект", exact: true })
    .click();
  await page
    .locator(".account-projects button")
    .filter({ hasText: "Clinic Cloud" })
    .click();
  await openArena();
  check(
    "Saved project is selected",
    (await page
      .getByLabel("Название стартапа", { exact: true })
      .inputValue()) === "Clinic Cloud",
  );
  check(
    "AI remains disabled without a configured API key",
    await page
      .getByLabel("Разбор с ИИ-наставником", { exact: true })
      .isDisabled(),
  );
  await page.getByLabel("Озвучивать вопросы нейтральным голосом").uncheck();
  await page.locator("input[type=file]").setInputFiles({
    name: "slide.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page
    .getByRole("button", { name: "Войти на арену", exact: true })
    .click();
  await page.locator(".phase-ready").waitFor();
  check(
    "Music pauses before recording or pitch starts",
    await page.getByTestId("background-music").evaluate((a) => a.paused),
  );
  await page
    .getByRole("button", { name: "Начать текстом", exact: true })
    .click();
  await page.locator("#pitch-transcript").fill(pitch);
  for (let attempt = 0; attempt < 50; attempt++) {
    if ((await boot()).draft?.state.pitch === pitch) break;
    await page.waitForTimeout(100);
  }
  const draft = (await boot()).draft;
  check(
    "Text and private slide saved on server",
    draft.state.pitch === pitch && draft.assets.length === 1,
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Продолжить питч", exact: true })
    .waitFor();
  check(
    "Reload offers a draft instead of opening microphone",
    (await page.locator(".game-room").count()) === 0,
  );
  await page
    .getByRole("button", { name: "Продолжить питч", exact: true })
    .click();
  await page.locator("#pitch-transcript").waitFor();
  check(
    "Pitch text restored after reload",
    (await page.locator("#pitch-transcript").inputValue()) === pitch,
  );
  await page.locator(".presentation>img").evaluate((img) => img.decode());
  check(
    "Private slides restored after reload",
    await page
      .locator(".presentation>img")
      .evaluate((img) => img.naturalWidth > 0),
  );
  await page
    .getByRole("button", { name: "Закончить питч", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Разобрать мой питч", exact: true })
    .click();
  await page.locator(".phase-analysis").waitFor();
  // Wait beyond autosave debounce to catch stale draft saves reverting the analysis.
  await page.waitForTimeout(800);
  check(
    "Autosave does not revert the confirmed debrief",
    (await boot()).draft.state.phase === "analysis",
  );
  await page
    .getByRole("button", { name: "Перейти к вопросам", exact: true })
    .click();
  await page.locator("#pitch-answer").fill(pitch);
  await page
    .getByRole("button", { name: "Разобрать ответ", exact: true })
    .click();
  await page.locator(".answer-review").waitFor();
  await page.reload();
  await page
    .getByRole("button", { name: "Продолжить питч", exact: true })
    .click();
  await page.locator(".answer-review").waitFor();
  check(
    "Q&A resumes on the saved feedback without duplicating an answer",
    (await boot()).draft.state.answers.length === 1,
  );
  await page
    .getByRole("button", { name: "Следующий вопрос", exact: true })
    .click();
  let count = 0;
  while (await page.locator(".phase-qa").count()) {
    assert.ok(++count <= 6);
    await page
      .locator("#pitch-answer")
      .fill(pitch + " Главный риск — конкурент с доступом к данным.");
    await page
      .getByRole("button", { name: "Разобрать ответ", exact: true })
      .click();
    await page.locator(".answer-review").waitFor();
    const last = page.getByRole("button", {
      name: "Узнать результат",
      exact: true,
    });
    if (await last.count()) {
      await last.click();
      break;
    } else
      await page
        .getByRole("button", { name: "Следующий вопрос", exact: true })
        .click();
  }
  await page
    .getByRole("heading", { name: "Раунд завершён", exact: true })
    .waitFor();
  const completed = await boot();
  check(
    "Server computes one completed result and clears the draft",
    completed.history.length === 1 &&
      completed.history[0].serverVerified &&
      completed.draft === null,
  );
  check(
    "Account result never leaks into guest history",
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("pa-history") || "[]").length === 0,
    ),
  );
  check(
    "Music resumes in results after leaving practice",
    await page.getByTestId("background-music").evaluate((a) => !a.paused),
  );
  await page
    .getByRole("button", { name: "Вернуться на карту", exact: true })
    .click();
  await page.screenshot({ path: "artifacts/v11-workspace-workspace.png" });
  const second = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const mobile = await second.newPage();
  mobile.on("pageerror", (e) => errors.push(e.message));
  await mobile.goto(origin + "/play");
  await signIn(mobile);
  check(
    "Second browser account sees the same project",
    (await boot(mobile)).projects[0].name === "Clinic Cloud",
  );
  await mobile.getByRole("button", { name: "Close", exact: true }).click();
  await mobile.getByRole("button", { name: "Menu", exact: true }).click();
  await mobile
    .locator(".nav-item")
    .filter({ hasText: "Мои выступления" })
    .click();
  check(
    "Second browser sees server history",
    (await mobile.locator(".history-item").count()) === 1,
  );
  check(
    "Account and music controls fit a mobile viewport",
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await mobile.waitForFunction(
    () => document.querySelector(".sidebar").getBoundingClientRect().right <= 0,
  );
  await mobile.screenshot({
    path: "artifacts/v11-workspace-mobile-history.png",
  });
  await page.getByRole("button", { name: "Аккаунт", exact: true }).click();
  await page
    .getByRole("button", { name: "Выйти из аккаунта", exact: true })
    .click();
  await page.getByRole("button", { name: "Войти", exact: true }).waitFor();
  check("Sign out restores separate guest data", (await boot()).user === null);
  check(
    "Sign out removes the account identity",
    (await page.locator(".profile-button strong").textContent()) ===
      "Гостевой режим" && (await page.locator(".top-avatar").count()) === 0,
  );
  await openArena();
  await page.getByLabel("Озвучивать вопросы нейтральным голосом").uncheck();
  await page
    .getByRole("button", { name: "Войти на арену", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Начать текстом", exact: true })
    .click();
  await page
    .locator("#pitch-transcript")
    .fill(
      "Это гостевой питч, который должен сохраниться только в текущем браузере.",
    );
  await page.reload();
  await page
    .getByRole("button", { name: "Продолжить питч", exact: true })
    .click();
  check(
    "Guest can resume a local draft",
    (await page.locator("#pitch-transcript").inputValue()).includes(
      "гостевой питч",
    ),
  );
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await page
    .getByRole("button", { name: "Выйти из миссии", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Удалить черновик", exact: true })
    .click();
  check(
    "Discard removes local draft",
    await page.evaluate(() => localStorage.getItem("pa-draft") === null),
  );
  check(
    "Music volume setting survives reload",
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("pa-audio")).volume === 0.12,
    ),
  );
  check("No browser runtime errors", errors.length === 0);
  mkdirSync("artifacts", { recursive: true });
  writeFileSync(
    "artifacts/v11-workspace-verification.json",
    JSON.stringify(
      { passed: checks.length, checks, errors, aiLiveTested: false },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
  await new Promise((resolve) => app.server.close(resolve));
  app.store.close();
  rmSync(dir, { recursive: true, force: true });
}
