import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { communityFixture } from "./community-fixture.mjs";
const f = await communityFixture();
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
});
const errors = [];
try {
  const owner = await f.register("novel@example.com");
  const cookie = owner.cookie;
  const project = await f.request("/projects", {
    method: "POST",
    cookie,
    data: { name: "OQU · Learning together" },
  });
  await f.request("/sessions", {
    method: "POST",
    cookie,
    data: {
      projectId: project.data.id,
      arenaId: "nfactorial",
      ask: 50000,
      pitchSeconds: 120,
      language: "ru",
      spokenQuestions: false,
    },
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const [name, value] = cookie.split("=");
  await context.addCookies([{ name, value, url: f.origin }]);
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  const b = (name) => page.getByRole("button", { name, exact: true });
  await page.goto(f.origin + "/play");
  await b("Продолжить питч").click();
  await b("Начать текстом").click();
  assert.equal(await page.locator(".investor-novel").count(), 0);
  await page
    .locator("#pitch-transcript")
    .fill(
      "Наш сервис помогает небольшим школам составлять расписание и экономить время. Директор загружает список учителей и получает готовое расписание. Двадцать школ платят подписку 30 долларов в месяц. За последний месяц мы провели 20 интервью. Просим 50000 долларов на разработку и продажи, чтобы за три месяца привлечь еще 50 школ.",
    );
  await b("Закончить питч").click();
  await b("Разобрать мой питч").click();
  assert.equal(await page.locator(".investor-novel").count(), 0);
  await b("Перейти к вопросам").click();
  await page.locator(".investor-novel").waitFor();
  assert.match(
    await page.locator(".novel-character img").getAttribute("src"),
    /arman.png/,
  );
  assert.equal(
    await page
      .locator(".novel-character img")
      .evaluate((el) => getComputedStyle(el).maskMode),
    "luminance",
  );
  assert.match(
    await page
      .locator(".novel-character img")
      .evaluate((el) => getComputedStyle(el).maskImage),
    /arman-mask.png/,
  );
  await b("Показать весь вопрос").click();
  await page.waitForFunction(
    () => document.querySelector(".novel-unrevealed")?.textContent === "",
  );
  const snap = (await f.request("/bootstrap", { cookie })).data.draft;
  assert.equal(
    await page.locator(".novel-accessible-question").innerText(),
    snap.state.questions[0].text,
  );
  console.log(
    "PASS Novel only appears after pitch and analysis, uses Arman portrait and exact contextual question",
  );
  mkdirSync("artifacts", { recursive: true });
  await page.screenshot({ path: "artifacts/v22-novel-desktop.png" });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.locator(".pitch-room").evaluate((el) => {
    el.scrollTop = 0;
  });
  const frame = await page.locator(".investor-novel").boundingBox();
  const questionBox = await page.locator(".novel-question").boundingBox();
  const inputBox = await page.locator("#pitch-answer").boundingBox();
  assert.ok(frame.height <= 520, "Novel must stay compact on laptops");
  assert.ok(
    questionBox.y + questionBox.height < 768,
    "Full question fits laptop viewport",
  );
  assert.ok(
    inputBox.y + inputBox.height < 768,
    "Answer field fits laptop viewport",
  );
  await page.screenshot({ path: "artifacts/v22-novel-laptop.png" });
  console.log(
    "PASS Compact novel, full question and answer fit a 1366x768 laptop",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page
      .locator(".pitch-room")
      .evaluate((e) => e.scrollWidth <= e.clientWidth),
  );
  await page.locator("#pitch-answer").scrollIntoViewIfNeeded();
  assert.ok(await page.locator("#pitch-answer").isVisible());
  await page
    .locator(".investor-novel")
    .screenshot({ path: "artifacts/v22-novel-mobile.png" });
  console.log(
    "PASS Mobile has no horizontal overflow and answer remains reachable",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  const answer =
    "Директор школы загружает список учителей и получает расписание. Двадцать школ платят 30 долларов в месяц по данным аналитики за сентябрь. Проверим спрос через 20 интервью за две недели. Направим средства на разработку и продажи и подключим 50 школ за три месяца. Конкурент — ручные таблицы, преимущество — автоматизация.";
  await page.locator("#pitch-answer").fill(answer);
  await page.reload();
  await b("Продолжить питч").click();
  await page.locator(".investor-novel").waitFor();
  assert.equal(await page.locator(".novel-unrevealed").textContent(), "");
  console.log("PASS Resumed QA and reduced-motion show full question");
  for (let i = 0; i < 7; i++) {
    await page.locator("#pitch-answer").fill(answer);
    await b("Разобрать ответ").click();
    await page.locator(".answer-review").waitFor();
    if (await b("Узнать результат").count()) {
      await b("Узнать результат").click();
      break;
    }
    await b("Следующий вопрос").click();
  }
  await page
    .getByRole("heading", { name: "Раунд завершён", exact: true })
    .waitFor();
  const done = (await f.request("/bootstrap", { cookie })).data;
  assert.equal(done.history.length, 1);
  assert.equal(done.draft, null);
  assert.equal(
    done.history[0].answers.length,
    done.history[0].questions.length,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS Every answer, follow-up and final result saved without browser errors",
  );
} finally {
  await browser.close();
  await f.close();
}
