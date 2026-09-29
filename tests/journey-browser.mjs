import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { communityFixture } from "./community-fixture.mjs";

const f = await communityFixture();
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1050 },
  reducedMotion: "no-preference",
});
const page = await context.newPage();
page.setDefaultTimeout(15000);
const checks = [],
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const check = (name, ok) => {
  assert.ok(ok, name);
  checks.push(name);
  console.log("PASS", name);
};
const button = (name) => page.getByRole("button", { name, exact: true });
const nav = (name) =>
  page.locator(".sidebar nav .nav-item").filter({ hasText: name });
const pitch =
  "Наш продукт помогает небольшим клиникам не терять заявки клиентов. Подписка стоит 30 долларов в месяц. За последний месяц мы проверили спрос на 20 интервью и получили 12 платящих клиентов. Просим 50000 долларов на разработку и продажи, чтобы за три месяца подключить еще 50 клиник.";
const answer =
  "За последний месяц мы провели 20 интервью с владельцами клиник и получили 12 платящих клиентов. Каждый платит 30 долларов в месяц по подписке. Деньги направим на разработку и продажи. За следующие три месяца проверим удержание клиентов и подключим еще 50 клиник.";
const bootstrap = async () =>
  (await f.request("/bootstrap", { cookie: owner.cookie })).data;
let owner;
try {
  mkdirSync("artifacts", { recursive: true });
  owner = await f.register("journey-founder@example.com");
  const [name, value] = owner.cookie.split("=");
  await context.addCookies([{ name, value, url: f.origin }]);
  await page.goto(f.origin + "/play");
  await nav("Карта и арены").click();
  const map = page.locator(".atlas-map");
  const routes = map.locator("[data-map-routes]");
  await routes.waitFor();
  check(
    "Playable map has animated routes",
    (await routes.locator("path").count()) > 0 &&
      (await routes.getAttribute("data-motion")) === "on",
  );
  const start = await routes
    .locator("path")
    .first()
    .getAttribute("stroke-dasharray");
  await page.waitForFunction(
    (start) =>
      document
        .querySelector(".atlas-map [data-map-routes] path")
        ?.getAttribute("stroke-dasharray") !== start,
    start,
  );
  check("Routes animate on the in-game map", true);
  await button("Приостановить анимации").click();
  check(
    "Pause stops in-game routes and beacons",
    (await routes.getAttribute("data-motion")) === "off" &&
      (await page.locator(".atlas-pin-live").count()) === 0,
  );
  await button("Включить анимации").click();
  await map
    .locator(".map-regions")
    .getByRole("button", { name: "СНГ", exact: true })
    .click();
  check(
    "Region zoom remains active",
    Number(
      (
        await page.getByTestId("atlas-camera").getAttribute("data-viewbox")
      ).split(" ")[2],
    ) < 1000,
  );
  await map.getByRole("button", { name: /Алматы, Казахстан ·/ }).click();
  await map.getByRole("button", { name: /MOST Ventures/ }).click();
  check(
    "Animated map still selects real funds",
    (await map.locator(".map-mission").innerText()).includes("MOST Ventures"),
  );
  await map.screenshot({ path: "artifacts/v18-map.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  check(
    "Animated map fits mobile",
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.waitForFunction(
    () => document.querySelector(".sidebar").getBoundingClientRect().right <= 0,
  );
  await map.screenshot({ path: "artifacts/v18-map-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(
    () =>
      document
        .querySelector(".atlas-map [data-map-routes]")
        ?.getAttribute("data-motion") === "off",
  );
  check(
    "System reduced motion stops map animation",
    (await routes.getAttribute("data-motion")) === "off",
  );
  await map
    .locator(".map-regions")
    .getByRole("button", { name: "Мир", exact: true })
    .click();
  await map.locator(".atlas-home").click();
  await map.locator(".map-mission .button").click();
  await page
    .getByLabel("Название стартапа", { exact: true })
    .fill("Journey Clinic");
  await page.getByLabel("Своя длительность в секундах").fill("60");
  await page.getByLabel("Озвучивать вопросы нейтральным голосом").uncheck();
  await button("Войти на арену").click();
  await page.locator(".phase-ready").waitFor();
  await button("Начать текстом").click();
  await page.locator("#pitch-transcript").fill(pitch);
  check(
    "Questions stay hidden while pitching",
    (await page.locator(".phase-qa").count()) === 0,
  );
  await page.waitForResponse(
    (r) => r.url().endsWith("/draft") && r.status() === 200,
  );
  await page.waitForFunction(
    () =>
      document.querySelector('[data-testid="pitch-countdown"]')?.textContent !==
      "01:00",
  );
  await page.reload();
  await button("Продолжить питч").click();
  await page.locator(".phase-pitch").waitFor();
  check(
    "Pitch and timer survive reload",
    (await page.locator("#pitch-transcript").inputValue()) === pitch &&
      (await page.getByTestId("pitch-countdown").innerText()) !== "01:00",
  );
  await button("Закончить питч").click();
  await page.locator(".phase-review").waitFor();
  let failAnalyze = true;
  await page.route("**/analyze", async (route) => {
    if (failAnalyze) {
      failAnalyze = false;
      await route.abort();
    } else await route.continue();
  });
  await button("Разобрать мой питч").click();
  await page.locator(".room-sync-error").waitFor();
  check(
    "Failed analysis keeps the transcript and phase",
    (await page.locator("#review-transcript").inputValue()) === pitch,
  );
  await button("Разобрать мой питч").click();
  await page.locator(".phase-analysis").waitFor();
  await button("Перейти к вопросам").click();
  await page.locator("#pitch-answer").fill(answer);
  let loseAnswer = true;
  await page.route("**/answer", async (route) => {
    if (loseAnswer) {
      loseAnswer = false;
      const response = await route.fetch();
      assert.equal(response.status(), 200);
      await route.abort();
    } else await route.continue();
  });
  await button("Разобрать ответ").click();
  await page.locator(".room-sync-error").waitFor();
  await button("Разобрать ответ").click();
  await button("Загрузить серверную версию").waitFor();
  await button("Загрузить серверную версию").click();
  await page.locator(".answer-review").waitFor();
  check(
    "Lost answer response recovers without duplicating the answer",
    (await bootstrap()).draft.state.answers.length === 1,
  );
  let loseResult = true;
  await page.route("**/complete", async (route) => {
    if (loseResult) {
      loseResult = false;
      const response = await route.fetch();
      assert.equal(response.status(), 200);
      await route.abort();
    } else await route.continue();
  });
  for (let i = 0; i < 10; i++) {
    if (await button("Узнать результат").count()) break;
    await page.locator(".answer-review .button.dark").click();
    await page.locator("#pitch-answer").fill(answer);
    await button("Разобрать ответ").click();
    await page.locator(".answer-review").waitFor();
  }
  await button("Узнать результат").click();
  await page.locator(".room-sync-error").waitFor();
  await button("Узнать результат").click();
  await page
    .getByRole("heading", { name: "Раунд завершён", exact: true })
    .waitFor();
  const saved = await bootstrap();
  check(
    "Lost completion response awards XP exactly once",
    saved.history.length === 1 &&
      saved.history[0].xp > 0 &&
      saved.draft === null,
  );
  check(
    "Completed transcript and every answer are saved",
    saved.history[0].pitchTranscript === pitch &&
      saved.history[0].answers.length === saved.history[0].questions.length,
  );
  await page
    .getByRole("dialog")
    .screenshot({ path: "artifacts/v18-result.png" });
  await page.locator(".result-next-challenge").scrollIntoViewIfNeeded();
  await page
    .locator(".result-next-challenge")
    .screenshot({ path: "artifacts/v18-next-arena.png" });
  await button("Продолжить путь").click();
  check(
    "Result opens the next unfinished arena",
    (await page.getByRole("dialog").innerText()).includes("nFactorial"),
  );
  check(
    "Next arena keeps the same project and uses its own time limit",
    (await page
      .getByLabel("Название стартапа", { exact: true })
      .inputValue()) === "Journey Clinic" &&
      (await page
        .getByRole("dialog")
        .getByRole("combobox")
        .first()
        .inputValue()) === saved.history[0].projectId &&
      (await page.getByLabel("Своя длительность в секундах").inputValue()) !==
        "60",
  );
  await button("Close").click();
  await nav("Мои выступления").click();
  await page.locator(".history-item").click();
  await button("Вернуться на карту").click();
  check("Back to map opens the actual arena map", await map.isVisible());
  await page.reload();
  await nav("Мои выступления").click();
  check(
    "Progress persists after reload",
    (await page.locator(".history-item").count()) === 1 &&
      (await page.locator(".history-stats").innerText()).includes(
        `${saved.history[0].xp} XP`,
      ),
  );
  const guest = await browser.newContext({ reducedMotion: "reduce" });
  const gp = await guest.newPage();
  await gp.goto(f.origin + "/play");
  await gp.locator(".nav-item").filter({ hasText: "Карта и арены" }).click();
  await gp.locator(".map-mission .button").click();
  await gp.getByLabel("Своя длительность в секундах").fill("30");
  await gp.getByLabel("Озвучивать вопросы нейтральным голосом").uncheck();
  await gp.getByRole("button", { name: "Войти на арену", exact: true }).click();
  await gp.getByRole("button", { name: "Начать текстом", exact: true }).click();
  await gp.locator("#pitch-transcript").fill(pitch);
  await gp.clock.install();
  await gp.clock.fastForward(31000);
  await gp.locator(".phase-review").waitFor();
  check(
    "Deadline ends the pitch before any questions",
    (await gp.locator(".phase-qa").count()) === 0 &&
      (await gp.locator("#review-transcript").inputValue()) === pitch,
  );
  check(
    "Account progress is isolated from guests",
    await gp.evaluate(
      () => JSON.parse(localStorage.getItem("pa-history")).length === 0,
    ),
  );
  await guest.close();
  check("No browser runtime errors", errors.length === 0);
  writeFileSync(
    "artifacts/v18-journey-verification.json",
    JSON.stringify({ checks, errors }, null, 2) + "\n",
  );
} finally {
  await browser.close();
  await f.close();
}
