import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzePitch,
  questionsFromPitch,
  arenas,
  medalsFor,
  totalXP,
  nextArena,
  panelFor,
} from "../src/game-data.js";
const ru = (ru, en) => ru;
const en = (ru, en) => en;

test("Questions follow the actual pitch and distinguish missing revenue evidence", () => {
  const arena = arenas.find((a) => a.id === "arena");
  const text =
    "Мы строим сервис доставки лекарств. У нас 120 клиентов и рост 15% каждый месяц.";
  const questions = questionsFromPitch(text, arena, 50000, ru);
  assert.equal(questions.length, 5);
  assert.ok(questions[0].includes("120 клиентов"));
  assert.ok(questions[1].includes("120"));
  assert.ok(questions[2].includes("Кто будет платить"));
  assert.ok(questions[3].includes("50,000"));
});
test("A text without metrics leads to a validation question, not invented traction", () => {
  const text =
    "We help small teams organize tasks with a simple product that makes their work easier.";
  const report = analyzePitch(text, en);
  assert.deepEqual(report.metrics, []);
  assert.equal(report.topics.find((t) => t.id === "traction").found, false);
  assert.ok(
    questionsFromPitch(text, arenas[0], 1000, en)[1].includes(
      "validate demand",
    ),
  );
});
test("nFactorial has its own product-oriented follow-up and verified persona mapping", () => {
  const arena = arenas.find((a) => a.id === "nfactorial");
  assert.equal(panelFor(arena)[0].id, "arman");
  assert.ok(
    questionsFromPitch(
      "We build products for small teams of ten people.",
      arena,
      1000,
      en,
    )[0].includes("users try today"),
  );
  assert.deepEqual(
    panelFor(arenas.find((a) => a.id === "arena")).map((p) => p.id),
    ["oskar", "anton", "vitaly"],
  );
});
test("Old results remain compatible with progression and XP", () => {
  const history = [
    { arenaId: "family", score: 60 },
    { arenaId: "nfactorial", xp: 210, score: 70 },
  ];
  assert.equal(totalXP(history), 310);
  assert.equal(nextArena(history).id, "arena");
  assert.equal(medalsFor(history).find((m) => m.id === "first").earned, true);
  assert.equal(medalsFor(history).find((m) => m.id === "boss").earned, false);
});
test("Campaign and boss medals require real completion evidence", () => {
  const history = ["family", "nfactorial", "arena", "yc", "a16z"].map(
    (arenaId) => ({ arenaId, score: 75, evidence: 3 }),
  );
  assert.equal(medalsFor(history).filter((m) => m.earned).length, 5);
  assert.equal(
    medalsFor(history.filter((h) => h.arenaId !== "arena")).find(
      (m) => m.id === "unicorn",
    ).earned,
    false,
  );
});
