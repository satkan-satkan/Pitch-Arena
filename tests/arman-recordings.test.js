import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import {
  armanRecordings,
  recordingForQuestion,
} from "../src/practice/arman-recordings.js";
import {
  createQuestions,
  createFollowUp,
  evaluateAnswer,
  evaluateSession,
} from "../src/practice/engine.js";
import { arenas } from "../src/game-data.js";

const arena = arenas.find((a) => a.id === "nfactorial");
const arman = { id: "arman" };
const pitch =
  "Пользователи клиники теряют часы на запись вручную. Наш сервис автоматизирует запись. У нас 120 клиентов за месяц по данным аналитики. Клиники платят подписку 3000 рублей за месяц. Направим средства на разработку и найм. Планируем привлечь 200 клиентов за три месяца.";

test("Arman's RU round uses all four exact recordings and retains five scoring dimensions", () => {
  const questions = createQuestions(pitch, arena, 50000);
  const recorded = questions
    .map((q) => recordingForQuestion(q, arman, "ru"))
    .filter(Boolean);
  assert.equal(recorded.length, 4);
  assert.deepEqual(
    new Set(recorded),
    new Set([
      armanRecordings.customer,
      armanRecordings.demand,
      armanRecordings.comparison,
      armanRecordings.funding,
    ]),
  );
  assert.equal(new Set(questions.map((q) => q.topicId)).size, 5);
  assert.equal(
    recordingForQuestion(
      questions.find((q) => q.id === "economics"),
      arman,
      "ru",
    ),
    null,
  );
  const answer = `${pitch} Конкурент — ручные таблицы, наше преимущество подтверждается данными эксперимента.`;
  const result = evaluateSession({
    pitch,
    questions,
    answers: questions.map(() => answer),
    arena,
  });
  assert.equal(result.score, 100);
  for (const clip of Object.values(armanRecordings)) {
    assert.ok(existsSync(`public${clip.src}`));
    assert.ok(statSync(`public${clip.src}`).size > 1000);
  }
});

test("EN, other speakers, contextual AI questions, follow-ups and old drafts cannot play a mismatched clip", () => {
  const questions = createQuestions(pitch, arena, 50000);
  const q = questions[0];
  assert.equal(recordingForQuestion(q, arman, "en"), null);
  assert.equal(recordingForQuestion(q, { id: "oskar" }, "ru"), null);
  assert.equal(
    recordingForQuestion(
      { ...q, text: `${q.text} Расскажи про клиники.` },
      arman,
      "ru",
    ),
    null,
  );
  assert.equal(
    recordingForQuestion({ ...q, followUp: true }, arman, "ru"),
    null,
  );
  const follow = createFollowUp(
    "Пока не знаю.",
    q,
    evaluateAnswer("Пока не знаю.", q),
  );
  assert.equal(recordingForQuestion(follow, arman, "ru"), null);
  for (const old of createQuestions(pitch, arena, 1, (_, en) => en))
    assert.equal(recordingForQuestion(old, arman, "ru"), null);
  const otherArena = { ...arena, personaIds: ["oskar"] };
  assert.ok(
    createQuestions(pitch, otherArena, 1).every(
      (item) => !recordingForQuestion(item, arman, "ru"),
    ),
  );
});
