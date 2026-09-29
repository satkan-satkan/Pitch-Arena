import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { communityFixture } from "./community-fixture.mjs";
const f = await communityFixture();
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH,
  args: [
    "--use-fake-device-for-media-stream",
    "--use-fake-ui-for-media-stream",
  ],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  reducedMotion: "reduce",
  permissions: ["microphone"],
});
const page = await context.newPage(),
  errors = [],
  checks = [];
page.on("pageerror", (e) => {
  errors.push(e.message);
  console.log("ERROR", e.message);
});
const check = (label, ok) => {
  assert.ok(ok, label);
  checks.push(label);
  console.log("PASS", label);
};
const btn = (name) => page.getByRole("button", { name, exact: true });
const field = (name) => page.getByLabel(name, { exact: true });
try {
  mkdirSync("artifacts", { recursive: true });
  await f.register("expansion@example.com", true);
  await page.goto(f.origin);
  check(
    "Landing removes nFactorial and exposes the real startup board",
    !(await page.getByText("nFactorial", { exact: true }).count()) &&
      (await page
        .getByRole("region", { name: "Витрина стартапов" })
        .isVisible()),
  );
  await page.screenshot({ path: "artifacts/v11-landing.png", fullPage: true });
  await btn("Познакомиться с Искрой").click();
  await page.locator(".iskra-sprite").waitFor();
  await page.evaluate(() =>
    Promise.all([...document.images].map((i) => i.decode().catch(() => {}))),
  );
  await page.screenshot({ path: "artifacts/v11-iskra.png" });
  await btn("Close").click();
  await btn("Войти").click();
  await field("Email").fill("expansion@example.com");
  await field("Пароль · от 12 символов").fill("community test password 123");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Войти", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Мои проекты", exact: true })
    .waitFor();
  await btn("Close").click();
  const map = page.locator(".atlas-map"),
    cam = page.getByTestId("atlas-camera");
  await page.locator(".nav-item").filter({ hasText: "Карта и арены" }).click();
  await map.waitFor();
  const world = await cam.getAttribute("data-viewbox");
  await map
    .locator(".map-regions")
    .getByRole("button", { name: "СНГ", exact: true })
    .click();
  check(
    "CIS selection zooms the geographic camera",
    Number((await cam.getAttribute("data-viewbox")).split(" ")[2]) <
      Number(world.split(" ")[2]),
  );
  await map.getByRole("button", { name: /Алматы, Казахстан ·/ }).click();
  check(
    "City clusters reveal local funds",
    await map.getByRole("button", { name: /MOST Ventures/ }).isVisible(),
  );
  await map.screenshot({ path: "artifacts/v11-map-cis.png" });
  await map
    .locator(".map-regions")
    .getByRole("button", { name: "Европа", exact: true })
    .click();
  await map.getByRole("button", { name: /Лондон, Великобритания ·/ }).click();
  check(
    "Europe exposes several distinct fund choices",
    await map.getByRole("button", { name: /Seedcamp/ }).isVisible(),
  );
  await map
    .locator(".map-regions")
    .getByRole("button", { name: "Америка", exact: true })
    .click();
  await map.getByRole("button", { name: /Сан-Франциско, США ·/ }).click();
  check(
    "Nearby Bay Area funds share an accessible pin",
    (await map.getByRole("button", { name: /Sequoia Capital/ }).isVisible()) &&
      (await map.getByRole("button", { name: /Accel/ }).isVisible()),
  );
  await page.locator(".nav-item").filter({ hasText: "Админка" }).click();
  await page
    .locator(".admin-tabs")
    .getByRole("button", { name: "Арены и инвесторы", exact: true })
    .click();
  await btn("Добавить фонд / арену").click();
  await field("ID карточки (латиница)").fill("new-studio");
  await field("Название · RU").fill("Новый фонд");
  await field("Название · EN").fill("New Studio Fund");
  await field("Описание · RU").fill("Учебная встреча с новой панелью");
  await field("Описание · EN").fill("Practice with a new panel");
  await field("Город и страна · RU").fill("Алматы, Казахстан");
  await field("Город и страна · EN").fill("Almaty, Kazakhstan");
  await field("Регион карты").selectOption("cis");
  await field("Код страны ISO, 3 цифры").fill("398");
  await field("Долгота").fill("76.89");
  await field("Широта").fill("43.24");
  await field("Причина изменения").fill("Creating a new practice fund");
  await btn("Создать карточку").click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  check(
    "Admin can create a fund through the UI",
    await page
      .getByRole("heading", { name: "Новый фонд", exact: true })
      .isVisible(),
  );
  await page
    .locator(".admin-catalog-switch")
    .getByRole("button", { name: "Инвесторы", exact: true })
    .click();
  await btn("Добавить инвестора").click();
  await field("ID карточки (латиница)").fill("new-person");
  await field("Имя · RU").fill("Тестовый инвестор");
  await field("Имя · EN").fill("Test investor");
  await field("Роль и организация").fill("New Studio Fund");
  await field("Фокус вопросов · RU").fill("Проверка спроса");
  await field("Фокус вопросов · EN").fill("Demand validation");
  await field("Фонд / арена").selectOption("new-studio");
  await field("Причина изменения").fill("Link investor to the new fund");
  await btn("Создать карточку").click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  check(
    "Admin can create and link an investor",
    await page
      .getByRole("heading", { name: "Тестовый инвестор", exact: true })
      .isVisible(),
  );
  await page.locator(".nav-item").filter({ hasText: "Инвесторы" }).click();
  await field("Поиск инвестора").fill("Тестовый");
  check(
    "Created investor is immediately playable",
    await btn("Начать диалог").isVisible(),
  );
  await btn("Начать диалог").click();
  await field("Название стартапа").fill("Signal Lab");
  await btn("Войти на арену").click();
  await page.locator(".phase-ready").waitFor();
  check(
    "New fund renders its real linked panel",
    await page
      .locator(".stage-investor")
      .getByText("Тестовый инвестор", { exact: true })
      .isVisible(),
  );
  await context.addInitScript(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    window.captureTracks = [];
    navigator.mediaDevices.getUserMedia = async (c) => {
      await new Promise((r) => setTimeout(r, window.permissionDelay || 0));
      const s = await original(c);
      window.captureTracks.push(...s.getTracks());
      return s;
    };
  });
  await page.reload();
  await btn("Продолжить питч").click();
  await page.locator(".phase-ready").waitFor();
  const before = await page.getByTestId("pitch-countdown").innerText();
  await btn("Проверить микрофон").click();
  await btn("Остановить проверку").waitFor();
  await page.waitForTimeout(400);
  await btn("Остановить проверку").click();
  await page.locator(".microphone-check audio").waitFor();
  check(
    "Mic check creates playback, releases the device and leaves the timer stopped",
    (await page.evaluate(() =>
      window.captureTracks.every((t) => t.readyState === "ended"),
    )) && (await page.getByTestId("pitch-countdown").innerText()) === before,
  );
  await page.screenshot({
    path: "artifacts/v11-room-preflight.png",
    fullPage: true,
  });
  await page.evaluate(() => {
    window.permissionDelay = 1600;
  });
  await btn("Начать с микрофоном").click();
  await page.waitForTimeout(400);
  check(
    "Waiting for microphone does not start the account timer",
    (await page.locator(".phase-ready").isVisible()) &&
      (await page.getByTestId("pitch-countdown").innerText()) === before,
  );
  await page.locator(".phase-pitch").waitFor();
  check(
    "Investors do not ask questions during the pitch",
    !(await page.locator(".phase-qa").count()),
  );
  await page.screenshot({
    path: "artifacts/v11-room-pitch.png",
    fullPage: true,
  });
  await page.reload();
  await btn("Продолжить питч").click();
  await page.locator(".phase-pitch").waitFor();
  check(
    "Reload restores the pitch without reopening the microphone",
    await page.evaluate(() => window.captureTracks.length === 0),
  );
  await page.goto(f.origin + "/play");
  await page.locator(".nav-item").filter({ hasText: "Карта и арены" }).click();
  await page.locator(".atlas-map").waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .locator(".map-regions")
    .getByRole("button", { name: "СНГ", exact: true })
    .click();
  check(
    "Map and board fit the mobile viewport",
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page
    .locator(".atlas-map")
    .screenshot({ path: "artifacts/v11-map-mobile.png" });
  check("No browser runtime errors", errors.length === 0);
  writeFileSync(
    "artifacts/v11-expansion-verification.json",
    JSON.stringify({ checks, errors }, null, 2),
  );
} finally {
  await browser.close();
  await f.close();
}
