import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { communityFixture, listing } from "./community-fixture.mjs";

const f = await communityFixture();
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1050 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
const checks = [],
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const check = (name, ok) => {
  assert.ok(ok, name);
  checks.push(name);
  console.log("PASS", name);
};
const button = (name) => page.getByRole("button", { name, exact: true });
const loaded = async (locator) => {
  await locator.scrollIntoViewIfNeeded();
  await locator
    .locator("img")
    .evaluateAll((images) => Promise.all(images.map((i) => i.decode())));
};
try {
  mkdirSync("artifacts", { recursive: true });
  const owner = await f.register("world-test@example.com", true);
  const create = async (name, revenue) => {
    const r = await f.request("/workspace/startups", {
      method: "POST",
      cookie: owner.cookie,
      data: {
        teamId: null,
        data: {
          ...listing,
          name,
          monthlyRevenue: revenue,
          description: "A collaborative product for startup founders. ".repeat(
            45,
          ),
        },
      },
    });
    assert.equal(r.status, 200);
    await f.request(`/workspace/startups/${r.data.id}/submit`, {
      method: "POST",
      cookie: owner.cookie,
      data: { revision: 1 },
    });
    const publish = await f.request(`/admin/startups/${r.data.id}`, {
      method: "PUT",
      cookie: owner.cookie,
      data: { revision: 2, action: "publish", reason: "Reviewed test listing" },
    });
    assert.equal(publish.status, 200);
    return r.data.id;
  };
  const first = await create("Orbit Studio", 1200),
    second = await create("Zero Studio", 0);
  await page.goto(f.origin);
  await loaded(page.locator(".beyond-garage"));
  await page
    .locator(".beyond-garage")
    .screenshot({ path: "artifacts/v16-beyond-garage.png" });
  check(
    "Old garage and three garage chapters remain",
    (await page.locator(".garage-image").getAttribute("src")) ===
      "/scenes/garage-night.png" &&
      (await page.locator(".garage-chapter").count()) === 3,
  );
  await page.locator(".beyond-garage-card").first().click();
  await loaded(page.locator('[data-garage-scene="office"]'));
  check(
    "Office leads to real investor selection",
    (await page.locator(".investor-full").count()) > 0,
  );
  await page.screenshot({ path: "artifacts/v16-investor-office.png" });
  const home = async () => {
    await page.goto(f.origin + "/play");
    await loaded(page.locator(".valley-map"));
  };
  await home();
  await page
    .locator(".valley-map")
    .screenshot({ path: "artifacts/v16-valley.png" });
  check(
    "Valley contains six destinations",
    (await page.locator(".valley-hotspot").count()) === 6,
  );
  await page
    .locator(".valley-hotspot")
    .filter({ hasText: "Репетиционная" })
    .click();
  await page.getByRole("dialog").waitFor();
  check(
    "Rehearsal hotspot opens pitch setup",
    await button("Войти на арену").isVisible(),
  );
  await button("Close").click();
  for (const [label, target] of [
    ["Кампус", ".community-page"],
    ["Выставка стартапов", ".public-directory"],
    ["Площадь лидеров", ".startup-leaderboard"],
  ]) {
    await home();
    await page.locator(".valley-hotspot").filter({ hasText: label }).click();
    await page.locator(target).waitFor();
    check(`Valley destination works: ${label}`, true);
  }
  await home();
  await page.locator(".nav-item").filter({ hasText: "Карта и арены" }).click();
  check(
    "Real geographic map is retained in arenas",
    await page.locator(".atlas-map").isVisible(),
  );

  await page.goto(`${f.origin}/startups/${first}`);
  await page.locator('[data-slot="widget-grid"]').waitFor();
  await loaded(page.locator(".public-campus-header"));
  await page
    .locator(".startup-detail")
    .screenshot({ path: "artifacts/v16-startup-widgets.png" });
  check(
    "Six widgets show published data",
    (await page.locator('[data-slot="widget"]').count()) === 6 &&
      (await page.locator(".widget-revenue").innerText()).includes("1 200"),
  );
  const description = page.locator(".widget-about .startup-widget-body");
  check(
    "Long description remains scrollable",
    await description.evaluate((e) => e.scrollHeight > e.clientHeight),
  );
  await button("Переставить блоки").click();
  const storageKey = `pa-startup-layout:v1:${first}`;
  const revenue = page.locator('[data-widget-id="revenue"]');
  await revenue.focus();
  await page.keyboard.press("Alt+ArrowRight");
  await page.waitForFunction(
    (key) => localStorage.getItem(key) !== null,
    storageKey,
  );
  const order = await page.evaluate(
    (key) => localStorage.getItem(key),
    storageKey,
  );
  check(
    "Keyboard rearrangement persists only the block IDs",
    JSON.parse(order).every((id) =>
      ["about", "revenue", "stage", "links", "region", "category"].includes(id),
    ),
  );
  await button("Готово").click();
  const rank = await revenue.getAttribute("aria-posinset");
  await page.reload();
  await revenue.waitFor();
  check(
    "Custom layout survives reload",
    (await revenue.getAttribute("aria-posinset")) === rank,
  );
  check(
    "Links work outside layout edit mode",
    (await page.locator(".widget-links a").first().getAttribute("href")) ===
      "https://example.com",
  );
  await button("Переставить блоки").click();
  const from = await revenue.boundingBox(),
    to = await page.locator('[data-widget-id="region"]').boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
    steps: 25,
  });
  await page.mouse.up();
  await page.waitForFunction(
    ({ key, previous }) => localStorage.getItem(key) !== previous,
    { key: storageKey, previous: order },
  );
  check("Mouse drag changes the saved order", true);
  await button("Сбросить").click();
  check(
    "Reset restores the default order",
    JSON.parse(
      await page.evaluate((key) => localStorage.getItem(key), storageKey),
    )[0] === "about",
  );
  await page.goto(`${f.origin}/startups/${second}`);
  await page.locator(".widget-revenue").waitFor();
  check(
    "Zero revenue is not treated as missing",
    (await page.locator(".widget-revenue").innerText()).includes("0"),
  );
  check(
    "Other startups do not inherit saved layouts",
    await page.evaluate(
      (key) => localStorage.getItem(key) === null,
      `pa-startup-layout:v1:${second}`,
    ),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".startup-widgets").scrollIntoViewIfNeeded();
  check(
    "Widget layout fits a phone",
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  check(
    "Phone uses one column for readable content",
    await page
      .locator('[data-slot="widget-grid"]')
      .evaluate(
        (e) => getComputedStyle(e).gridTemplateColumns.split(" ").length === 1,
      ),
  );
  await page
    .locator(".startup-detail")
    .screenshot({ path: "artifacts/v16-startup-mobile.png" });
  await button("Switch to English").click();
  await page
    .getByRole("heading", { name: "About the product", exact: true })
    .waitFor();
  check(
    "Widget controls support English",
    (await button("Arrange blocks").count()) === 1,
  );
  await page.goto(f.origin + "/play");
  await loaded(page.locator(".valley-map"));
  check(
    "Valley fits a phone",
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page
    .locator(".valley-map")
    .screenshot({ path: "artifacts/v16-valley-mobile.png" });
  check(
    "Mobile map offers readable destination buttons",
    (await page.locator(".valley-mobile-places button").count()) === 6 &&
      (await page.locator(".valley-mobile-places").isVisible()),
  );
  const touchContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const touchPage = await touchContext.newPage();
  touchPage.on("pageerror", (e) => errors.push(e.message));
  await touchPage.goto(`${f.origin}/startups/${first}`);
  await touchPage
    .getByRole("button", { name: "Переставить блоки", exact: true })
    .click();
  const touchRevenue = touchPage.locator('[data-widget-id="revenue"]');
  const positionRevenue = async () =>
    touchRevenue.evaluate((el) =>
      window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 130),
    );
  await positionRevenue();
  const cdp = await touchContext.newCDPSession(touchPage);
  const startTouch = async (x, y) =>
    cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y, id: 1 }],
    });
  const moveTouch = async (x, y) =>
    cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x, y, id: 1 }],
    });
  const endTouch = async () =>
    cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  let box = await touchRevenue.boundingBox();
  const beforeScroll = await touchPage.evaluate(() => scrollY);
  await startTouch(box.x + 30, box.y + 100);
  await moveTouch(box.x + 30, box.y + 25);
  await moveTouch(box.x + 30, box.y - 25);
  await endTouch();
  await touchPage.waitForFunction(
    (before) => scrollY > before + 20,
    beforeScroll,
  );
  check("Touch swipe scrolls the page even in arrange mode", true);
  await positionRevenue();
  box = await touchRevenue.boundingBox();
  const destination = await touchPage
    .locator('[data-widget-id="stage"]')
    .boundingBox();
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  await startTouch(x, y);
  // This wait exercises the component's 350 ms long-press gesture threshold.
  await touchPage.waitForTimeout(400);
  for (let i = 1; i <= 12; i++)
    await moveTouch(
      x,
      y + ((destination.y + destination.height / 2 - y) * i) / 12,
    );
  await endTouch();
  await touchPage.waitForFunction(
    (key) => localStorage.getItem(key) !== null,
    storageKey,
  );
  check("Touch long press reorders and saves widgets", true);
  await touchContext.close();
  check("No browser runtime errors", errors.length === 0);
  writeFileSync(
    "artifacts/v16-world-verification.json",
    JSON.stringify({ checks, errors }, null, 2) + "\n",
  );
} finally {
  await browser.close();
  await f.close();
}
