import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { communityFixture } from "./community-fixture.mjs";
const f = await communityFixture();
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
});
try {
  const owner = await f.register("profile-teams@example.com");
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const [name, value] = owner.cookie.split("=");
  await context.addCookies([{ name, value, url: f.origin }]);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const b = (name) => page.getByRole("button", { name, exact: true });
  const field = (name) => page.getByLabel(name, { exact: true });
  const nav = (text) =>
    page.locator(".sidebar .nav-item").filter({ hasText: text });
  await page.goto(f.origin + "/play");
  await page.locator(".profile-button").click();
  await field("Твоё имя").fill("Алия Султанова");
  await field("Твоя роль").fill("Основатель · Product designer");
  await field("Город и страна").fill("Алматы, Казахстан");
  await field("О себе").fill(
    "Создаю инструменты для небольших команд. Люблю исследовать проблемы пользователей и проверять идеи.",
  );
  assert.equal(await field("Название стартапа").count(), 0);
  await page.route("**/api/profile", (route) => route.abort());
  await b("Сохранить профиль").click();
  await page.locator(".founder-profile-editor [role=alert]").waitFor();
  assert.equal(await field("Город и страна").inputValue(), "Алматы, Казахстан");
  await page.unroute("**/api/profile");
  await b("Сохранить профиль").click();
  await page
    .locator(".founder-profile-editor [role=status]")
    .filter({ hasText: "Изменения сохранены" })
    .waitFor();
  await page.reload();
  await page.locator(".profile-button").click();
  assert.equal(
    await field("Твоя роль").inputValue(),
    "Основатель · Product designer",
  );
  await field("Твоя роль").fill("Несохранённая роль");
  await b("Отменить изменения").click();
  assert.equal(
    await field("Твоя роль").inputValue(),
    "Основатель · Product designer",
  );
  mkdirSync("artifacts", { recursive: true });
  await page.screenshot({
    path: "artifacts/v27-profile-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page
    .locator(".founder-profile-editor")
    .screenshot({ path: "artifacts/v27-profile-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  console.log(
    "PASS Profile edits survive save failure and reload; discard restores saved fields; mobile fits",
  );

  await page.route("**/api/workspace/teams", (route) => route.abort());
  await nav("Стартапы и команды").click();
  await page.locator(".workspace-load-error").waitFor();
  await page.unroute("**/api/workspace/teams");
  await b("Повторить").click();
  await b("Выбрать личное пространство").waitFor();
  assert.equal(await page.locator(".workspace-load-error").count(), 0);
  const createTeam = async (name, failRefresh = false) => {
    await b("Создать команду").click();
    await field("Название команды").fill(name);
    if (failRefresh)
      await page.route("**/api/workspace/teams", (route) =>
        route.request().method() === "GET" ? route.abort() : route.continue(),
      );
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Создать команду", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    if (failRefresh) {
      await page
        .getByText("Действие сохранено, но список не обновился.", {
          exact: false,
        })
        .waitFor();
      await page.unroute("**/api/workspace/teams");
      await b("Обновить данные").click();
    }
    await b(`Выбрать команду: ${name}`).waitFor();
    assert.equal(
      await b(`Выбрать команду: ${name}`).getAttribute("aria-pressed"),
      "true",
    );
  };
  await createTeam("Orbit", true);
  assert.equal(
    (await f.request("/workspace/teams", { cookie: owner.cookie })).data.teams
      .length,
    1,
  );
  await createTeam("Side Project");
  const createStartup = async (name, ownerLabel) => {
    await b("Новый стартап").click();
    assert.equal(
      await field("Владелец карточки").locator("option:checked").innerText(),
      ownerLabel,
    );
    await field("Название стартапа").fill(name);
    await field("Продукт одним предложением").fill(
      "Инструменты для небольших команд",
    );
    await field("Описание продукта").fill(
      "Помогаем небольшим командам проверять идеи и готовить презентации продукта.",
    );
    await b("Сохранить черновик").click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page.locator(".startup-card h2").filter({ hasText: name }).waitFor();
  };
  await createStartup("Shared Product", "Side Project");
  await b("Выбрать команду: Orbit").click();
  assert.equal(await page.locator(".startup-card").count(), 0);
  await b("Выбрать личное пространство").click();
  await createStartup("Solo Product", "Мой аккаунт");
  await b("Добавить в команду").click();
  await field("Команда для стартапа").selectOption({ label: "Orbit" });
  await b("Дать команде доступ").click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  assert.equal(
    await b("Выбрать команду: Orbit").getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(
    await page.locator(".startup-card h2").innerText(),
    "Solo Product",
  );
  await b("Выбрать личное пространство").click();
  assert.equal(await page.locator(".startup-card").count(), 0);
  assert.equal((await f.request("/startups")).data.total, 0);
  await b("Выбрать команду: Orbit").click();
  await page.screenshot({
    path: "artifacts/v27-teams-desktop.png",
    fullPage: true,
  });
  await page.reload();
  await nav("Стартапы и команды").click();
  await page.locator(".startup-card h2").waitFor();
  assert.equal(
    await b("Выбрать команду: Orbit").getAttribute("aria-pressed"),
    "true",
  );
  await b("Switch to English").click();
  await b("Select personal workspace").click();
  await b("Select team: Orbit").click();
  assert.equal(
    await page.locator(".startup-card h2").innerText(),
    "Solo Product",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page
    .locator(".team-selection-shell")
    .screenshot({ path: "artifacts/v27-teams-mobile.png" });
  assert.deepEqual(errors, []);
  console.log(
    "PASS Loading retry clears errors; creation avoids duplicates after refresh failure; team selection filters and sets ownership; explicit sharing stays private; RU/EN and mobile work",
  );
} finally {
  await browser.close();
  await f.close();
}
