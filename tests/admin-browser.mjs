import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createPgTestStore } from "./postgres-fixture.mjs";
import { createApp } from "../server/app.js";
import { grantOwner } from "../server/admin.js";
const store = await createPgTestStore(),
  dir = mkdtempSync(join(tmpdir(), "pitch-admin-ui-"));
const app = createApp({
  store,
  assetDir: join(dir, "assets"),
  mentor: { ready: false },
  secureCookies: false,
});
await app.ready;
await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
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
  }),
  page = await context.newPage();
const checks = [],
  errors = [];
page.on("pageerror", (e) => {
  errors.push(e.message);
  console.log("BROWSER ERROR", e.message);
});
const check = (name, value) => {
  assert.ok(value, name);
  checks.push(name);
  console.log("PASS", name);
};
const password = "admin browser testing 123";
const request = async (path, data) => {
  const r = await fetch(origin + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  assert.ok(r.ok);
  return r.json();
};
async function section(name) {
  await page
    .locator(".admin-tabs")
    .getByRole("button", { name, exact: true })
    .click();
  await page
    .locator(".admin-empty")
    .filter({ hasText: "Загружаем" })
    .waitFor({ state: "hidden" });
}
async function save() {
  await page
    .getByLabel("Причина изменения", { exact: true })
    .fill("Проверка управления каталогом");
  await page
    .getByRole("button", { name: "Сохранить изменения", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.locator(".admin-notice").waitFor();
}
try {
  await request("/api/auth/register", {
    email: "owner@example.com",
    password,
    name: "Владелец",
  });
  await request("/api/auth/register", {
    email: "member@example.com",
    password,
    name: "Участник",
  });
  await grantOwner(store, "owner@example.com");
  await page.goto(origin + "/play");
  check(
    "Guest cannot see admin navigation",
    (await page.locator(".nav-item").filter({ hasText: "Админка" }).count()) ===
      0,
  );
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill("owner@example.com");
  await page
    .getByLabel("Пароль · от 12 символов", { exact: true })
    .fill(password);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Войти", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Мой аккаунт", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.locator(".nav-item").filter({ hasText: "Админка" }).click();
  await page
    .getByRole("heading", { name: "Состояние системы", exact: true })
    .waitFor();
  await section("Обзор");
  await page.getByText("PostgreSQL", { exact: true }).waitFor();
  check(
    "Selecting the active section keeps its content visible",
    await page.locator(".admin-stats").isVisible(),
  );
  check(
    "Owner dashboard reads actual PostgreSQL metrics",
    (await page.locator(".admin-stats strong").first().textContent()) === "2" &&
      (await page.getByText("PostgreSQL", { exact: true }).isVisible()),
  );
  check(
    "AI status is honest without a key",
    await page.getByText("Ожидает API-ключ", { exact: true }).isVisible(),
  );
  mkdirSync("artifacts", { recursive: true });
  await page.screenshot({ path: "artifacts/v11-admin-overview.png" });
  await section("Пользователи");
  await page.getByLabel("Поиск в админке", { exact: true }).fill("member@");
  await page.getByRole("button", { name: "Найти", exact: true }).click();
  await page
    .locator("tbody tr")
    .filter({ hasText: "member@example.com" })
    .getByRole("button", { name: "Управлять", exact: true })
    .click();
  await page.getByLabel("Статус", { exact: true }).selectOption("blocked");
  await save();
  await page
    .locator("tbody tr")
    .filter({ hasText: "member@example.com" })
    .getByText("Заблокирован", { exact: true })
    .waitFor();
  check(
    "Owner can block a member through the UI",
    (
      await store.get(
        "SELECT status FROM users WHERE email=?",
        "member@example.com",
      )
    ).status === "blocked",
  );
  await section("Арены и инвесторы");
  await page
    .locator(".admin-catalog-grid article")
    .filter({ hasText: "Арена Единорогов" })
    .getByRole("button", { name: "Редактировать", exact: true })
    .click();
  await page.getByLabel("Название · RU", { exact: true }).fill("Арена роста");
  await page.getByLabel("Название · EN", { exact: true }).fill("Growth arena");
  await page.getByLabel("Время питча, секунд", { exact: true }).fill("180");
  await save();
  await page
    .getByRole("heading", { name: "Арена роста", exact: true })
    .waitFor();
  check(
    "Arena editor persists revision and pitch duration",
    JSON.parse(
      (
        await store.get(
          "SELECT data FROM catalog WHERE kind='arena' AND id='arena'",
        )
      ).data,
    ).pitchSeconds === 180,
  );
  const guest = await browser.newContext({
      viewport: { width: 1440, height: 1050 },
    }),
    player = await guest.newPage();
  player.on("pageerror", (e) => errors.push(e.message));
  await player.goto(origin + "/play");
  await player
    .locator(".nav-item")
    .filter({ hasText: "Карта и арены" })
    .click();
  await player
    .locator(".map-regions")
    .getByRole("button", { name: "СНГ", exact: true })
    .click();
  await player.getByRole("button", { name: /Москва, Россия ·/ }).click();
  await player
    .locator(".atlas-fund-list")
    .getByRole("button", { name: /Арена роста/ })
    .click();
  await player
    .locator(".map-mission")
    .getByRole("button", { name: "На сцену", exact: true })
    .click();
  check(
    "Public map and setup use the edited catalog",
    (await player.getByLabel("Своя длительность в секундах").inputValue()) ===
      "180",
  );
  await player.getByRole("button", { name: "Close", exact: true }).click();
  await page
    .getByRole("main")
    .getByRole("button", { name: "Инвесторы", exact: true })
    .click();
  await page
    .locator(".admin-catalog-grid article")
    .filter({ hasText: "Оскар Хартманн" })
    .getByRole("button", { name: "Редактировать", exact: true })
    .click();
  await page
    .getByLabel("Роль и организация", { exact: true })
    .fill("Venture · Test profile");
  await save();
  await player.reload();
  await player.locator(".nav-item").filter({ hasText: "Инвесторы" }).click();
  check(
    "Investor edits appear in the player directory",
    await player
      .getByText("Venture · Test profile", { exact: true })
      .isVisible(),
  );
  await section("Журнал действий");
  await page.getByText("user.updated", { exact: true }).waitFor();
  check(
    "User and catalog changes appear in audit log",
    (await page.getByText("catalog.updated", { exact: true }).count()) === 2,
  );
  await page.locator(".admin-audit summary").first().click();
  await page.screenshot({ path: "artifacts/v11-admin-audit.png" });
  await section("Обзор");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "artifacts/v11-admin-mobile.png" });
  check(
    "Admin overview fits mobile width",
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page
    .getByRole("button", { name: "Switch to English", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Control room", exact: true })
    .waitFor();
  check(
    "Admin interface supports English",
    await page.getByText("Awaiting API key", { exact: true }).isVisible(),
  );
  check("No browser runtime errors", errors.length === 0);
  writeFileSync(
    "artifacts/v11-admin-verification.json",
    JSON.stringify(
      {
        passed: checks.length,
        checks,
        errors,
        database: "postgres",
        aiLiveTested: false,
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
  await new Promise((r) => app.server.close(r));
  await store.close();
  rmSync(dir, { recursive: true, force: true });
}
