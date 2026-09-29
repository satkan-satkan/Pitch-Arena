import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { communityFixture, listing } from "./community-fixture.mjs";
const f = await communityFixture();
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : {}),
});
const checks = [],
  errors = [];
const check = (label, ok) => {
  assert.ok(ok, label);
  checks.push(label);
  console.log("PASS", label);
};
try {
  mkdirSync("artifacts", { recursive: true });
  const owner = await f.register("release-owner@example.com", true),
    viewer = await f.register("release-viewer@example.com");
  const team = (
    await f.request("/workspace/teams", {
      method: "POST",
      cookie: owner.cookie,
      data: { name: "Launch Crew", description: "A real test team", links: {} },
    })
  ).data;
  await f.request(`/workspace/teams/${team.id}/invitations`, {
    method: "POST",
    cookie: owner.cookie,
    data: { email: "release-viewer@example.com", role: "editor" },
  });
  const id = (
    await f.request("/workspace/startups", {
      method: "POST",
      cookie: viewer.cookie,
      data: {
        teamId: null,
        data: { ...listing, name: "Launch Studio", monthlyRevenue: 1200 },
      },
    })
  ).data.id;
  await f.request(`/workspace/startups/${id}/submit`, {
    method: "POST",
    cookie: viewer.cookie,
    data: { revision: 1 },
  });
  await f.request(`/admin/startups/${id}`, {
    method: "PUT",
    cookie: owner.cookie,
    data: {
      revision: 2,
      action: "publish",
      reason: "Reviewed public test listing",
    },
  });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 820 },
    reducedMotion: "reduce",
  });
  const [name, ...value] = viewer.cookie.split("=");
  await ctx.addCookies([{ name, value: value.join("="), url: f.origin }]);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  const button = (n) => page.getByRole("button", { name: n, exact: true });
  const nav = (n) =>
    page.locator(".sidebar nav .nav-item").filter({ hasText: n });
  const unlocked = async () => {
    check(
      "Page unlocks after all overlays close",
      await page.evaluate(
        () => getComputedStyle(document.body).overflow !== "hidden",
      ),
    );
    await nav("Инвесторы").click();
    await page.locator(".investor-full").first().waitFor();
    await page.mouse.move(1100, 650);
    await page.mouse.wheel(0, 1200);
    await page.waitForFunction(() => scrollY > 100);
    check(
      "Wheel scroll works after changing tabs",
      await page.evaluate(() => scrollY > 100),
    );
  };
  await page.goto(f.origin + "/play");
  await page.getByTestId("unread-notifications").waitFor();
  await button("Уведомления").click();
  await page
    .locator(".notification-center")
    .getByText("Launch Crew", { exact: true })
    .waitFor();
  check(
    "Notifications show an actual invitation and moderation result",
    await page
      .locator(".notification-center")
      .getByText("Launch Studio", { exact: true })
      .isVisible(),
  );
  await button("Отметить прочитанными").click();
  await button("Уведомления").click();
  await page.reload();
  await button("Уведомления").click();
  await page
    .locator(".notification-center")
    .getByText("Launch Crew", { exact: true })
    .waitFor();
  check(
    "Read notification state survives reload",
    (await page.getByTestId("unread-notifications").count()) === 0,
  );
  await page
    .locator(".notification-center")
    .getByRole("button")
    .filter({ hasText: "Launch Crew" })
    .click();
  await page.getByRole("heading", { name: "С кем строим?" }).waitFor();
  check(
    "Notification opens the working team workspace",
    await page.getByRole("heading", { name: "С кем строим?" }).isVisible(),
  );
  await nav("Рейтинг стартапов").click();
  await page.locator(".live-ranking button").first().waitFor();
  check(
    "Leaderboard shows a published startup rather than demo XP",
    (await page.locator(".live-ranking").innerText()).includes(
      "Launch Studio",
    ) && !(await page.locator(".live-ranking").innerText()).includes("XP"),
  );
  await page.screenshot({ path: "artifacts/v14-leaderboard.png" });
  await page.getByLabel("Валюта выручки").selectOption("EUR");
  await page.getByText("Первое место пока свободно", { exact: true }).waitFor();
  await page.getByLabel("Валюта выручки").selectOption("USD");
  await page.locator(".live-ranking button").first().click();
  await page
    .getByRole("heading", { name: "Launch Studio", exact: true })
    .waitFor();
  check("Ranking opens the public startup detail", true);
  await page.goto(f.origin + "/play");
  await button("Как это работает").click();
  await button("Попробовать").click();
  await page.getByRole("dialog").waitFor();
  await button("Close").click();
  await unlocked();
  // Leaving a room tears down both the room and its nested confirmation dialog.
  await nav("Комната основателя").click();
  await button("Начать раунд").click();
  await button("Войти на арену").click();
  await page.locator(".phase-ready").waitFor();
  await page.locator('.room-header button[aria-label="Выйти"]').click();
  await page.getByRole("dialog").waitFor();
  await button("Close").click();
  check(
    "Room keeps the page locked after its confirmation closes",
    await page.evaluate(() => document.body.style.overflow === "hidden"),
  );
  await page.locator('.room-header button[aria-label="Выйти"]').click();
  await button("Выйти из миссии").click();
  await page.locator(".pitch-room").waitFor({ state: "detached" });
  await unlocked();
  for (const label of [
    "Комната основателя",
    "Карта и арены",
    "Инвесторы",
    "Мои выступления",
    "Рейтинг стартапов",
    "Стартапы и команды",
  ]) {
    await nav(label).click();
    await button("Гид Искра").click();
    await button("Close").click();
    check(
      `${label}: guide closes without leaving a scroll lock`,
      await page.evaluate(() => document.body.style.overflow !== "hidden"),
    );
  }
  await page.setViewportSize({ width: 390, height: 700 });
  await page.reload();
  await button("Menu").click();
  await button("Гид Искра").click();
  await button("Close").click();
  check(
    "Mobile menu retains its own scroll lock after closing a dialog",
    await page.evaluate(() => document.body.style.overflow === "hidden"),
  );
  await nav("Инвесторы").click();
  await page.mouse.move(300, 600);
  await page.mouse.wheel(0, 900);
  await page.waitForFunction(() => scrollY > 100);
  check(
    "Mobile navigation unlocks the content",
    await page.evaluate(() => document.body.style.overflow !== "hidden"),
  );
  await button("Menu").click();
  await page.setViewportSize({ width: 1440, height: 820 });
  await page.waitForFunction(() => document.body.style.overflow !== "hidden");
  check("Resizing from an open mobile drawer releases the page", true);
  await nav("Рейтинг стартапов").click();
  await page.locator(".live-ranking button").first().waitFor();
  await page.setViewportSize({ width: 390, height: 700 });
  check(
    "Leaderboard fits mobile width",
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: "artifacts/v14-leaderboard-mobile.png",
    fullPage: true,
  });
  await button("Уведомления").click();
  await page.locator(".notification-center li").first().waitFor();
  await page.screenshot({ path: "artifacts/v14-notifications-mobile.png" });
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1440, height: 820 });
  await button("Switch to English").click();
  await page
    .getByRole("heading", { name: "Startup leaderboard", exact: true })
    .waitFor();
  check(
    "Leaderboard supports English",
    await page.getByLabel("Revenue currency").isVisible(),
  );
  await page.route("**/api/startups?sort=revenue**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "UNAVAILABLE" }),
    }),
  );
  await button("Refresh").click();
  await page.getByRole("alert").waitFor();
  await page.unroute("**/api/startups?sort=revenue**");
  await button("Retry").click();
  await page.locator(".live-ranking button").first().waitFor();
  check("Leaderboard recovers after a failed request", true);
  check("No browser runtime errors", errors.length === 0);
  writeFileSync(
    "artifacts/v14-prelaunch-verification.json",
    JSON.stringify({ checks, errors }, null, 2) + "\n",
  );
} finally {
  await browser.close();
  await f.close();
}
