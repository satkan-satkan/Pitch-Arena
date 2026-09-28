import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : {}),
  args: [
    "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream",
  ],
});
const checks = [],
  errors = [];
const check = (name, value) => {
  assert.ok(value, name);
  checks.push(name);
  console.log("PASS", name);
};
const origin = process.env.PITCH_URL || "http://localhost:5174";
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  reducedMotion: "reduce",
  permissions: ["microphone", "camera"],
});
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(e.message));
const weak =
  "Мы готовим новую идею для будущего и хотим сделать что-то полезное и интересное.";
const strong =
  "Клиники теряют часы на запись вручную. Наш сервис автоматизирует запись и отправляет напоминания. У нас 120 клиентов за месяц по данным аналитики. Клиники платят подписку 3000 рублей за месяц. Направим средства на разработку и найм. Планируем привлечь 200 клиентов за три месяца.";
await mkdir("artifacts", { recursive: true });
async function reviewPitch(text) {
  await page.locator("#pitch-transcript").fill(text);
  await page
    .getByRole("button", { name: "Закончить питч", exact: true })
    .click();
  await page.locator(".phase-review").waitFor();
  check(
    "No questions before transcript confirmation",
    (await page.locator(".question-bubble").count()) === 0,
  );
  await page
    .getByRole("button", { name: "Разобрать мой питч", exact: true })
    .click();
  await page.locator(".phase-analysis").waitFor();
  check(
    "Five expandable evidence dimensions",
    (await page.locator(".topic-evidence-list details").count()) === 5,
  );
  await page.locator(".topic-evidence-list summary").first().click();
  await page
    .getByRole("button", { name: "Перейти к вопросам", exact: true })
    .click();
}
async function answerRound(text, screenshot) {
  let count = 0;
  while (await page.locator(".phase-qa").count()) {
    assert.ok(count < 7, "bounded question count");
    await page.locator("#pitch-answer").fill(text);
    await page
      .getByRole("button", { name: "Разобрать ответ", exact: true })
      .click();
    await page.locator(".answer-review").waitFor();
    check(
      "Answer feedback includes two specific checks",
      (await page.locator(".answer-review .evidence-checks li").count()) === 2,
    );
    if (count === 0 && screenshot)
      await page.screenshot({
        path: `artifacts/${screenshot}.png`,
        fullPage: false,
      });
    const last = page.getByRole("button", {
      name: "Узнать результат",
      exact: true,
    });
    if (await last.count()) await last.click();
    else
      await page
        .getByRole("button", { name: "Следующий вопрос", exact: true })
        .click();
    count++;
  }
  await page.getByRole("heading", { name: "Миссия пройдена!" }).waitFor();
  return count;
}
try {
  await page.addInitScript(() => {
    window.__tracks = [];
    const original = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    navigator.mediaDevices.getUserMedia = async (options) => {
      const stream = await original(options);
      window.__tracks.push(...stream.getTracks());
      return stream;
    };
    window.SpeechRecognition = undefined;
    window.webkitSpeechRecognition = undefined;
  });
  await page.goto(origin);
  await page.locator(".map-pin").first().waitFor();
  await page
    .getByRole("button", {
      name: "Арена Единорогов — Москва, Россия",
      exact: true,
    })
    .click();
  await page
    .locator(".map-mission")
    .getByRole("button", { name: "На сцену", exact: true })
    .click();
  await page
    .getByLabel("Название стартапа", { exact: true })
    .fill("Clinic Loop");
  await page.getByLabel("Своя длительность в секундах").fill("30");
  await page.getByLabel("Озвучивать вопросы нейтральным голосом").uncheck();
  await page
    .getByRole("button", { name: "Войти на арену", exact: true })
    .click();
  check(
    "No question on the ready screen",
    (await page.locator(".question-bubble").count()) === 0,
  );
  await page
    .getByRole("button", { name: "Начать текстом", exact: true })
    .click();
  await reviewPitch(weak);
  const firstCount = await answerRound(
    "Пока я об этом ничего не знаю.",
    "v3-answer-feedback",
  );
  check("Weak answers produce only one contextual follow-up", firstCount === 6);
  let history = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("pa-history")),
  );
  check(
    "Versioned result preserves full dialogue and rubric",
    history[0].scoringVersion === 3 &&
      history[0].questionPlan.length === 6 &&
      history[0].dimensions.length === 5,
  );
  check(
    "Follow-up quotes the player's actual answer",
    history[0].questions[1].includes("Пока я об этом ничего не знаю."),
  );
  check("Weak attempt has no length or digit bonuses", history[0].score === 0);
  check(
    "First attempt establishes baseline",
    await page
      .getByRole("heading", { name: "Точка отсчёта сохранена" })
      .isVisible(),
  );
  await page
    .getByRole("button", { name: "Улучшить питч", exact: true })
    .click();
  check(
    "Retry preserves startup and time limit",
    (await page
      .getByLabel("Название стартапа", { exact: true })
      .inputValue()) === "Clinic Loop" &&
      (await page.getByLabel("Своя длительность в секундах").inputValue()) ===
        "30",
  );
  check(
    "Retry displays a concrete mission",
    (await page.locator(".practice-goal").count()) === 1,
  );
  await page.getByLabel("Озвучивать вопросы нейтральным голосом").uncheck();
  await page
    .getByRole("button", { name: "Войти на арену", exact: true })
    .click();
  await page.clock.install();
  await page
    .getByRole("button", { name: "Начать с микрофоном", exact: true })
    .click();
  await page.locator(".phase-pitch").waitFor();
  await page.locator("#pitch-transcript").fill(strong);
  await page.clock.fastForward(31000);
  await page.locator(".phase-review").waitFor();
  await page.clock.resume();
  check(
    "Timer stops recording and exposes the audio clip",
    (
      await page.locator(".audio-playback audio").getAttribute("src")
    ).startsWith("blob:"),
  );
  check(
    "Microphone tracks released",
    await page.evaluate(() =>
      window.__tracks.every((t) => t.readyState === "ended"),
    ),
  );
  await page
    .getByRole("button", { name: "Разобрать мой питч", exact: true })
    .click();
  await page.locator(".topic-evidence-list summary").first().click();
  check(
    "Analysis evidence is quoted from the pitch",
    (
      await page
        .locator(".topic-evidence-list blockquote")
        .first()
        .textContent()
    ).includes("Клиники теряют"),
  );
  await page.screenshot({ path: "artifacts/v3-debrief.png", fullPage: false });
  await page
    .getByRole("button", { name: "Перейти к вопросам", exact: true })
    .click();
  await answerRound(strong + " Главный риск — конкурент с доступом к данным.");
  history = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("pa-history")),
  );
  check(
    "Repeat attempt improves the score",
    history.length === 2 && history[0].score > history[1].score,
  );
  check(
    "Comparison shows real previous and current scores",
    (await page.locator(".comparison-score strong").textContent()) ===
      `${history[1].score} → ${history[0].score}`,
  );
  check(
    "Five dimension deltas rendered",
    (await page.locator(".rubric-delta").count()) === 5,
  );
  await page.screenshot({ path: "artifacts/v3-results.png", fullPage: false });
  await page.locator(".practice-goal").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "artifacts/v3-next-mission.png" });
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Скачать диалог", exact: true })
    .click();
  const file = await download;
  const content = await readFile(await file.path(), "utf8");
  check(
    "Export includes pitch, goal and comparison",
    content.includes(strong) &&
      content.includes("СЛЕДУЮЩАЯ ПОПЫТКА") &&
      content.includes("ИЗМЕНЕНИЕ БАЛЛА"),
  );
  await page
    .getByRole("button", { name: "Вернуться на карту", exact: true })
    .click();
  await page.reload();
  await page
    .locator(".nav-item")
    .filter({ hasText: "Мои выступления" })
    .click();
  await page.locator(".history-item").first().click();
  check(
    "Comparison survives reload",
    await page.locator(".comparison-score").isVisible(),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  check(
    "Result has no horizontal overflow on mobile",
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: "artifacts/v3-mobile-results.png",
    fullPage: false,
  });
  await page
    .getByRole("button", { name: "Вернуться на карту", exact: true })
    .click();
  await page.getByRole("button", { name: "Switch to English" }).click();
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page.locator(".nav-item").filter({ hasText: "My pitches" }).click();
  await page.locator(".history-item").first().click();
  check(
    "Rubric and mission localize to English",
    (await page
      .getByRole("heading", { name: "How your score adds up" })
      .isVisible()) &&
      (await page.locator(".practice-goal").textContent()).includes(
        "YOUR NEXT ATTEMPT MISSION",
      ),
  );
  await page
    .getByRole("button", { name: "Back to the world map", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Y Combinator — San Francisco, USA",
      exact: true,
    })
    .click();
  await page
    .locator(".map-mission")
    .getByRole("button", { name: "Enter the arena", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Enter the arena", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Start with text", exact: true })
    .click();
  await page
    .locator("#pitch-transcript")
    .fill(
      "We do not have 120 customers this month. We have an idea for a new product.",
    );
  await page
    .getByRole("button", { name: "Finish my pitch", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Review my pitch", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Start investor questions", exact: true })
    .click();
  await page
    .locator("#pitch-answer")
    .fill("Our customers are small clinics that waste hours on manual work.");
  await page
    .getByRole("button", { name: "Review answer", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Next question", exact: true })
    .click();
  check(
    "English demand question does not treat negated metrics as traction",
    (await page.locator(".question-bubble").textContent()).includes(
      "validate demand",
    ),
  );
  check(
    "Mobile question room has no horizontal page overflow",
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: "artifacts/v3-mobile-question.png",
    fullPage: false,
  });
  await page.getByRole("button", { name: "Exit", exact: true }).click();
  await page
    .getByRole("button", { name: "Leave mission", exact: true })
    .click();
  check(
    "Unfinished attempt creates no rewards",
    (await page.evaluate(() => JSON.parse(localStorage.getItem("pa-history"))))
      .length === 2,
  );
  // Legacy history is opened in a fresh isolated context; it is never compared to v3.
  const legacy = await context.newPage();
  legacy.on("pageerror", (e) => errors.push(e.message));
  await legacy.goto(origin);
  await legacy.evaluate(() =>
    localStorage.setItem(
      "pa-history",
      JSON.stringify([
        {
          id: 1,
          date: "2026-01-01T12:00:00Z",
          startup: "Old demo",
          arena: "Family",
          arenaId: "family",
          score: 50,
          duration: 120,
          coverage: 2,
          evidence: 1,
          questions: ["Why?"],
          answers: ["Because."],
          scoringVersion: 2,
        },
      ]),
    ),
  );
  await legacy.reload();
  await legacy.locator(".nav-item").filter({ hasText: "My pitches" }).click();
  await legacy.locator(".history-item").click();
  check(
    "Legacy results remain readable",
    (await legacy
      .getByRole("heading", { name: "Mission complete!" })
      .isVisible()) &&
      (await legacy.locator(".practice-feedback").count()) === 0,
  );
  check("No browser runtime errors", errors.length === 0);
  await writeFile(
    "artifacts/v3-verification.json",
    JSON.stringify({ passed: checks.length, checks, errors }, null, 2) + "\n",
  );
} finally {
  await browser.close();
}
