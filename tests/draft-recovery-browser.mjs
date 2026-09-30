import { chromium } from "playwright";
import assert from "node:assert/strict";
import { communityFixture } from "./community-fixture.mjs";
const f = await communityFixture();
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
});
try {
  const owner = await f.register("recovery@example.com");
  const cookie = owner.cookie;
  const project = await f.request("/projects", {
    method: "POST",
    cookie,
    data: { name: "Recovery test" },
  });
  const draft = await f.request("/sessions", {
    method: "POST",
    cookie,
    data: {
      projectId: project.data.id,
      arenaId: "family",
      ask: 10000,
      pitchSeconds: 120,
      language: "ru",
      spokenQuestions: false,
    },
  });
  assert.equal(draft.status, 201);
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const [name, value] = cookie.split("=");
  await context.addCookies([{ name, value, url: f.origin }]);
  const page = await context.newPage();
  const b = (name) => page.getByRole("button", { name, exact: true });
  await page.goto(f.origin + "/play");
  await page
    .locator(".sidebar nav .nav-item")
    .filter({ hasText: "Карта и арены" })
    .click();
  const map = page.locator(".atlas-map");
  await map.locator(".atlas-home").click();
  await map.locator(".map-mission .button").click();
  await page.locator(".setup-draft-recovery").waitFor();
  assert.equal(await b("Войти на арену").isDisabled(), true);
  await b("Продолжить прежний питч").click();
  await page.locator(".phase-ready").waitFor();
  assert.equal(await page.locator(".setup-draft-recovery").count(), 0);
  console.log("PASS Resume from setup closes setup and opens saved session");
  await b("Выйти").click();
  await b("Выйти из миссии").click();
  await map.locator(".map-mission .button").click();
  await page
    .locator(".modal input[type=file]")
    .setInputFiles({
      name: "new-deck.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n%%EOF"),
    });
  await b("Начать новый вместо него").click();
  await b("Отмена").click();
  assert.equal(
    (await f.request("/bootstrap", { cookie })).data.draft.id,
    draft.data.id,
  );
  await b("Начать новый вместо него").click();
  await b("Удалить прежний питч").click();
  await page.locator(".setup-draft-recovery").waitFor({ state: "detached" });
  assert.match(await page.locator(".file-list").innerText(), /new-deck.pdf/);
  assert.equal((await f.request("/bootstrap", { cookie })).data.draft, null);
  assert.equal(await b("Войти на арену").isEnabled(), true);
  console.log(
    "PASS Explicit discard preserves selected files and unblocks new pitch; cancel preserves draft",
  );
} finally {
  await browser.close();
  await f.close();
}
