import test from "node:test";
import assert from "node:assert/strict";
import {
  summarizeScores,
  analyzePitch,
  createQuestions,
  evaluateAnswer,
  evaluateSession,
  createFollowUp,
  compareAttempt,
  transitionPhase,
} from "../src/practice/engine.js";
import { arenas, medalsFor } from "../src/game-data.js";
const en = (_, en) => en;
const arena = arenas[0];
const weak =
  "We have an idea that could become something interesting and useful for everyone.";
const strong =
  "Small clinics waste hours on manual bookings. Our product automates bookings and sends reminders. We have 120 customers in the last month according to analytics. Clinics pay a subscription of $30 per month. We will use the funds for development and hiring. We will reach 200 customers in three months.";
const strongRu =
  "Клиники теряют часы на запись вручную. Наш сервис автоматизирует запись и отправляет напоминания. У нас 120 клиентов за месяц по данным аналитики. Клиники платят подписку 3000 рублей за месяц. Направим средства на разработку и найм. Планируем привлечь 200 клиентов за три месяца.";
function complete(pitch, answers = []) {
  const questions = createQuestions(pitch, arena, 50000, en);
  return evaluateSession({ pitch, answers, questions, arena });
}
test("Concrete RU and EN pitches cover all dimensions; feedback quotes only input", () => {
  for (const pitch of [strong, strongRu]) {
    const report = analyzePitch(pitch);
    assert.equal(report.score, 50);
    for (const topic of report.topics) {
      assert.equal(topic.status, "supported", topic.id);
      for (const check of topic.checks) assert.ok(pitch.includes(check.quote));
    }
  }
  assert.equal(analyzePitch(weak).score, 0);
});
test("Word padding, repeated sentences and disconnected digits earn no extra credit", () => {
  assert.equal(
    analyzePitch(`${weak} ${"wonderful ".repeat(300)} 2026 100 7`).score,
    0,
  );
  assert.equal(
    analyzePitch(`${strong} ${strong}`).score,
    analyzePitch(strong).score,
  );
  const questions = createQuestions(weak, arena, 50000, en);
  const spam = questions.map(() => `${"wonderful ".repeat(30)} 2026 100 7`);
  assert.equal(
    evaluateSession({ pitch: weak, questions, answers: spam, arena }).score,
    0,
  );
});
test("Negated metrics and forecasts do not become observed demand", () => {
  for (const pitch of [
    "We do not have 120 customers this month.",
    "We plan to reach 120 customers next month.",
    "У нас нет 120 клиентов за месяц.",
    "Мы планируем получить 120 клиентов за месяц.",
  ]) {
    const report = analyzePitch(pitch);
    assert.equal(
      report.topics.find((x) => x.id === "traction").points,
      0,
      pitch,
    );
    assert.match(
      createQuestions(pitch, arena, 1, en)[1].text,
      /validate demand/,
    );
  }
});
test("Questions retain quotes and change with observed demand, arena and funding ask", () => {
  const questions = createQuestions(strong, arena, 50000, en);
  assert.match(questions[1].text, /120 customers/);
  assert.match(questions[3].text, /50,000/);
  assert.equal(
    createQuestions(
      strong,
      arenas.find((a) => a.id === "nfactorial"),
      1,
      en,
    )[0].id,
    "demo",
  );
  assert.equal(
    createQuestions(
      strong,
      arenas.find((a) => a.id === "arena"),
      1,
      en,
    )[4].id,
    "risk",
  );
});
test("Follow-up quotes the actual answer and requests a missing element", () => {
  const q = createQuestions(weak, arena, 1, en)[0];
  const answer = "Our customers are small clinics.";
  const report = evaluateAnswer(answer, q);
  assert.equal(report.points, 5);
  const follow = createFollowUp(answer, q, report, en);
  assert.ok(follow.text.includes(answer));
  assert.ok(follow.text.includes("loses or cannot do"));
  assert.equal(follow.parentId, q.id);
  assert.equal(follow.speakerIndex, q.speakerIndex);
  assert.equal(createFollowUp(answer, follow, report, en), null);
  assert.equal(createFollowUp(strong, q, evaluateAnswer(strong, q), en), null);
});
test("Follow-up fills missing checks but never adds a sixth scoring dimension", () => {
  const base = createQuestions(strong, arena, 1, en);
  const first = "Our customers are small clinics.";
  const follow = createFollowUp(
    first,
    base[0],
    evaluateAnswer(first, base[0]),
    en,
  );
  const questions = [base[0], follow, ...base.slice(1)];
  const answers = [
    first,
    "They waste hours on manual bookings.",
    ...base.slice(1).map(() => strong),
  ];
  const report = evaluateSession({ pitch: strong, questions, answers, arena });
  assert.equal(report.score, 100);
  assert.equal(report.dimensions.length, 5);
  assert.equal(report.dimensions[0].answerPoints, 10);
  assert.equal(report.xp, arena.xp + 50);
});
test("Next mission identifies a missing opening-pitch criterion", () => {
  const report = complete(weak);
  assert.equal(report.nextGoal.criterionId, "customer");
  assert.equal(report.nextGoal.quote, "");
  assert.equal(report.score, 0);
  assert.equal(report.stars, 1);
  assert.ok(report.xp > 0, "completing a practice still earns base XP");
});
test("Comparison uses only older matching startup, arena, duration and scoring version", () => {
  const baseline = {
    ...complete(weak),
    id: 1,
    date: "2026-09-28T10:00:00Z",
    startup: "Clinic",
    arenaId: "family",
    pitchLimit: 120,
  };
  const current = {
    ...baseline,
    ...complete(strong),
    id: 10,
    date: "2026-09-28T11:00:00Z",
    startup: " clinic ",
  };
  const mismatch = [
    { ...baseline, id: 9, startup: "Other" },
    { ...baseline, id: 8, arenaId: "arena" },
    { ...baseline, id: 7, pitchLimit: 60 },
    { ...baseline, id: 6, scoringVersion: 2 },
  ];
  const newer = { ...current, id: 11, score: 100 };
  const result = compareAttempt(current, [
    newer,
    current,
    ...mismatch,
    baseline,
  ]);
  assert.equal(result.previousId, 1);
  assert.equal(result.delta, 50);
  assert.equal(result.pitchDelta, 50);
  assert.equal(compareAttempt(current, [current, ...mismatch]), null);
  assert.equal(compareAttempt(baseline, [newer, current, baseline]), null);
});
test("A lower score is reported honestly", () => {
  const common = { startup: "Clinic", arenaId: "family", pitchLimit: 120 };
  const old = { ...common, ...complete(strong), id: 1 };
  const current = { ...common, ...complete(weak), id: 2 };
  assert.equal(compareAttempt(current, [current, old]).delta, -50);
});
test("Phase rules prevent questions before the confirmed debrief and double completion", () => {
  assert.equal(transitionPhase("ready", "QUESTIONS"), "ready");
  assert.equal(transitionPhase("pitch", "QUESTIONS"), "pitch");
  let phase = "ready";
  for (const event of [
    "START",
    "STOP",
    "ANALYZE",
    "EDIT",
    "ANALYZE",
    "QUESTIONS",
    "COMPLETE",
  ])
    phase = transitionPhase(phase, event);
  assert.equal(phase, "completed");
  assert.equal(transitionPhase(phase, "COMPLETE"), "completed");
});

test("A complete pitch with incomplete answers creates an answer-focused mission", () => {
  const result = complete(strong);
  assert.equal(result.nextGoal.source, "answer");
  assert.equal(result.nextGoal.criterionId, "customer");
});

test("New numeric medal requires demand and price evidence; old earned medals survive", () => {
  const medal = (history) =>
    medalsFor(history).find((m) => m.id === "numbers").earned;
  assert.equal(
    medal([{ scoringVersion: 3, evidence: 5, numericEvidence: ["price"] }]),
    false,
  );
  assert.equal(
    medal([{ scoringVersion: 3, numericEvidence: ["observed", "price"] }]),
    true,
  );
  assert.equal(medal([{ scoringVersion: 2, evidence: 3 }]), true);
});

test("Dashboard and map scores exclude older formulas and retain a real zero", () => {
  assert.deepEqual(summarizeScores([{ scoringVersion: 2, score: 90 }]), {
    average: null,
    best: null,
  });
  assert.deepEqual(
    summarizeScores([
      { scoringVersion: 3, score: 0 },
      { scoringVersion: 2, score: 90 },
    ]),
    { average: 0, best: 0 },
  );
  assert.deepEqual(
    summarizeScores([
      { scoringVersion: 3, score: 30 },
      { scoringVersion: 3, score: 50 },
    ]),
    { average: 40, best: 50 },
  );
});
