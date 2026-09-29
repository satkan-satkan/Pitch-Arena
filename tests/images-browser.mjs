import { chromium } from "playwright";
import assert from "node:assert/strict";
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import { communityFixture } from "./community-fixture.mjs";

const f = await communityFixture();
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1050 },
  reducedMotion: "reduce",
});
const page = await context.newPage(),
  checks = [],
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const check = (name, ok) => {
  assert.ok(ok, name);
  checks.push(name);
  console.log("PASS", name);
};
const button = (name) => page.getByRole("button", { name, exact: true });
const field = (name) => page.getByLabel(name, { exact: true });
const image = async (body) =>
  sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">${body}</svg>`,
    ),
  )
    .png()
    .toBuffer();
const logo = await image(
  '<rect width="256" height="256" fill="#ddeb59"/><circle cx="128" cy="128" r="57" fill="none" stroke="#171717" stroke-width="22"/><circle cx="183" cy="95" r="19" fill="#171717"/>',
);
const portrait = await image(
  '<rect width="256" height="256" fill="#435c67"/><circle cx="128" cy="93" r="40" fill="#e5d5b5"/><path d="M48 256v-28a80 80 0 0 1 160 0v28" fill="#1a2229"/>',
);
const upload = async (label, buffer) => {
  await field(label).setInputFiles({
    name: "test.png",
    mimeType: "image/png",
    buffer,
  });
  await page
    .locator(".image-picker")
    .filter({ has: field(label) })
    .locator("img")
    .waitFor();
  await button("Обработка…").waitFor({ state: "hidden" });
};
try {
  mkdirSync("artifacts", { recursive: true });
  const owner = await f.register("images-test@example.com"),
    admin = await f.register("images-admin@example.com", true);
  const [name, value] = owner.cookie.split("=");
  await context.addCookies([{ name, value, url: f.origin }]);
  await page.goto(f.origin + "/play");
  await button("Мой профиль").click();
  await upload("Аватар профиля", portrait);
  const saved = page.waitForResponse(
    (r) => r.url().endsWith("/api/profile") && r.request().method() === "PUT",
  );
  await button("Сохранить профиль").click();
  check("Profile upload saves successfully", (await saved).status() === 200);
  await page.reload();
  await page.locator(".top-avatar img").waitFor();
  check(
    "Profile avatar survives reload",
    await page
      .locator(".top-avatar img")
      .evaluate((i) => i.decode().then(() => i.naturalWidth === 256)),
  );
  await button("Мой профиль").click();
  await page
    .locator(".profile-form")
    .screenshot({ path: "artifacts/v19-profile-avatar.png" });
  await field("Аватар профиля").setInputFiles({
    name: "bad.png",
    mimeType: "image/png",
    buffer: Buffer.from("invalid image"),
  });
  await page.locator(".image-picker [role=alert]").waitFor();
  check(
    "Invalid upload shows a recoverable message",
    await page.locator(".image-picker img").isVisible(),
  );
  await page
    .locator(".nav-item")
    .filter({ hasText: "Стартапы и команды" })
    .click();
  await button("Новый стартап").click();
  await upload("Логотип стартапа", logo);
  await upload("Фото основателя для каталога", portrait);
  await field("Имя основателя").fill("Alex Morgan");
  await field("Месяц основания").fill("2025-09");
  await field("Название стартапа").fill("Orbit Studio");
  await field("Продукт одним предложением").fill(
    "A workspace for founders to turn their next big idea into a business.",
  );
  await field("Описание продукта").fill(
    "Orbit Studio brings customer research, product experiments and team decisions into one shared workspace. Built for independent founders, with a clear view of what to test next.",
  );
  await field("Город или регион").fill("Almaty, Kazakhstan");
  await field("Website").fill("https://example.com");
  await field("Выручка за всё время").fill("15764");
  await field("MRR · доход от подписок в месяц").fill("820");
  await field("Выручка за месяц").fill("1200");
  await button("Сохранить черновик").click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  const draft = (
    await f.request("/workspace/startups", { cookie: owner.cookie })
  ).data.items[0];
  check(
    "Editor saves logo, founder and distinct metrics",
    !!draft.data.logo &&
      !!draft.data.founderAvatar &&
      draft.data.monthlyRecurringRevenue === 820 &&
      draft.data.monthlyRevenue === 1200,
  );
  check(
    "Private draft never appears in catalogue",
    (await f.request(`/startups/${draft.id}`)).status === 404,
  );
  await f.request(`/workspace/startups/${draft.id}/submit`, {
    method: "POST",
    cookie: owner.cookie,
    data: { revision: draft.revision },
  });
  const published = await f.request(`/admin/startups/${draft.id}`, {
    method: "PUT",
    cookie: admin.cookie,
    data: {
      revision: draft.revision + 1,
      action: "publish",
      reason: "Reviewed test images and data",
    },
  });
  check("Moderation publishes uploaded images", published.status === 200);
  await page.goto(`${f.origin}/startups/${draft.id}`);
  await page.locator(".startup-brand-image img").waitFor();
  await page
    .locator(".startup-overview img")
    .evaluateAll((all) => Promise.all(all.map((i) => i.decode())));
  check(
    "Reference layout has four real metrics and two images",
    (await page.locator(".startup-key-metrics > section").count()) === 4 &&
      (await page.locator(".startup-overview img").count()) === 2,
  );
  check(
    "Original draggable widgets remain available",
    (await page.locator('[data-slot="widget"]').count()) === 6,
  );
  check(
    "Visit opens the founder supplied website",
    (await page
      .getByRole("link", { name: "Открыть сайт", exact: true })
      .getAttribute("href")) === "https://example.com",
  );
  await page.evaluate(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.__copied = text;
        },
      },
    });
  });
  await button("Поделиться").click();
  await page.getByText("Ссылка скопирована", { exact: true }).waitFor();
  check(
    "Share copies the actual public URL",
    await page.evaluate(() => window.__copied === location.href),
  );
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    }),
  );
  await button("Поделиться").click();
  check(
    "Sharing still works without clipboard access",
    (await field("Ссылка на стартап").inputValue()) === page.url(),
  );
  await page.reload();
  await page.locator(".startup-overview").waitFor();
  await button("Switch to English").click();
  await page
    .getByRole("heading", { name: "All-time revenue", exact: true })
    .waitFor();
  await page
    .locator(".startup-overview")
    .screenshot({ path: "artifacts/v19-startup-overview.png" });
  check(
    "English metrics render real values",
    (await page.locator(".startup-key-metrics").innerText()).includes(
      "$15,764",
    ),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  check(
    "Mobile overview text is not clipped",
    await page
      .locator(".startup-intro > p")
      .evaluate(
        (p) =>
          p.scrollWidth <= p.clientWidth &&
          p.getBoundingClientRect().right <= innerWidth,
      ),
  );
  check(
    "Startup details fit a mobile screen",
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: "artifacts/v19-startup-mobile.png",
    fullPage: true,
  });
  await page.goto(f.origin + "/startups");
  await page.locator(".startup-monogram img").waitFor();
  check(
    "Catalogue uses the published logo",
    await page
      .locator(".startup-monogram img")
      .evaluate((i) => i.decode().then(() => i.naturalWidth === 256)),
  );
  check("No uncaught browser errors", errors.length === 0);
  writeFileSync(
    "artifacts/v19-images-verification.json",
    JSON.stringify({ checks, errors }, null, 2) + "\n",
  );
} finally {
  await browser.close();
  await f.close();
}
