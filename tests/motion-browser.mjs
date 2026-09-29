import { chromium } from "playwright";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { communityFixture } from "./community-fixture.mjs";
const f = await communityFixture();
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : {}),
});
const checks = [],
  errors = [];
const check = (name, result) => {
  assert.ok(result, name);
  checks.push(name);
  console.log("PASS", name);
};
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "no-preference",
});
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(f.origin);
  await page.waitForFunction(
    () => document.documentElement.dataset.motion === "on",
  );
  const scene = page.locator('[data-tilt="scene"]');
  await scene.hover({ position: { x: 1120, y: 420 } });
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-tilt="scene"]')
        .style.transform.includes("rotateX(") &&
      !document
        .querySelector('[data-tilt="scene"]')
        .style.transform.includes("rotateX(0deg)"),
  );
  check("Scene reacts to a fine pointer", true);
  check(
    "Scene has a live breathing animation",
    await page
      .locator(".garage-image")
      .evaluate(
        (el) => getComputedStyle(el).animationName === "garage-breathe",
      ),
  );
  await page
    .getByRole("button", { name: "Приостановить анимации", exact: true })
    .click();
  await page.waitForFunction(
    () => document.documentElement.dataset.motion === "off",
  );
  check(
    "Pause stops scene loops and pointer transforms",
    await scene.evaluate(
      (el) =>
        getComputedStyle(el).transform === "none" &&
        getComputedStyle(el.querySelector(".garage-image")).animationName ===
          "none",
    ),
  );
  await page.reload();
  await page.waitForFunction(
    () => document.documentElement.dataset.motion === "off",
  );
  check(
    "Motion preference survives reload",
    await page
      .getByRole("button", { name: "Включить анимации", exact: true })
      .isVisible(),
  );
  check(
    "Paused reveals leave content accessible",
    await page
      .locator(".landing-end")
      .evaluate((el) => getComputedStyle(el).opacity === "1"),
  );
  await page
    .getByRole("button", { name: "Включить анимации", exact: true })
    .click();
  const tabs = page.getByRole("tablist", { name: "Этапы тренировки" });
  await tabs.scrollIntoViewIfNeeded();
  await tabs.getByRole("tab").first().focus();
  await page.keyboard.press("End");
  check(
    "Animated tabs preserve keyboard selection and focus",
    await tabs
      .getByRole("tab")
      .last()
      .evaluate(
        (el) =>
          el === document.activeElement &&
          el.getAttribute("aria-selected") === "true",
      ),
  );
  check(
    "Active tab uses the animated background",
    (await tabs
      .getByRole("tab")
      .last()
      .locator(".tab-active-background")
      .count()) === 1,
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(
    () => document.documentElement.dataset.motion === "off",
  );
  check(
    "System reduced motion stops all decorative loops",
    await page
      .locator(".garage-image")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName === "none"),
  );
  check(
    "Reduced-motion preference cannot be overridden accidentally",
    await page
      .getByRole("button", {
        name: "Анимации отключены настройкой устройства",
        exact: true,
      })
      .isDisabled(),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "artifacts/v10-motion-mobile.png",
    fullPage: true,
  });
  check(
    "Restored scene and motion controls fit mobile",
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  check("No animation runtime errors", errors.length === 0);
  writeFileSync(
    "artifacts/v10-motion-verification.json",
    JSON.stringify({ passed: checks.length, checks, errors }, null, 2),
  );
} finally {
  await context.close();
  await browser.close();
  await f.close();
}
