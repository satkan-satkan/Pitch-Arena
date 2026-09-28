import test from "node:test";
import assert from "node:assert/strict";
import {
  guideCue,
  initialGuide,
  guideTransition,
  parseGuide,
} from "../src/guide/model.js";
test("The introduction never completes a practice; only its matching finished session marks onboarding complete", () => {
  let s = guideTransition(initialGuide(), { type: "intro" });
  s = guideTransition(s, { type: "step", step: 2 });
  assert.equal(s.status, "learning");
  assert.equal(s.sessionId, null);
  s = guideTransition(s, { type: "started", id: "real-session" });
  assert.equal(
    guideTransition(s, { type: "completed", id: "other-session" }).status,
    "practicing",
  );
  assert.equal(
    guideTransition(s, { type: "discarded", id: "real-session" }).status,
    "learning",
  );
  assert.equal(
    guideTransition(s, { type: "completed", id: "real-session" }).status,
    "completed",
  );
  assert.equal(s.xp, undefined);
});
test("Guide emotions use actual phase and failure state instead of pretending to understand audio", () => {
  assert.equal(guideCue({ phase: "pitch", busy: true }).emotion, "listening");
  assert.equal(guideCue({ phase: "pitch", error: true }).emotion, "support");
  assert.equal(guideCue({ phase: "review" }).emotion, "thinking");
  assert.equal(guideCue({ phase: "analysis", busy: true }).emotion, "thinking");
  assert.equal(guideCue({ phase: "qa", answered: true }).emotion, "support");
  assert.equal(guideCue({ phase: "completed", score: 0 }).emotion, "support");
  assert.equal(
    guideCue({ phase: "completed", score: 80 }).emotion,
    "celebrate",
  );
});
test("Malformed stored guide preferences recover safely; disabled tips survive mission progress", () => {
  assert.deepEqual(parseGuide("bad json"), initialGuide());
  assert.deepEqual(parseGuide('{"version":0}'), initialGuide());
  assert.equal(
    parseGuide('{"version":1,"introStep":100,"status":"fake"}').introStep,
    2,
  );
  let s = guideTransition(initialGuide(), { type: "toggle" });
  s = guideTransition(s, { type: "started", id: "session" });
  s = guideTransition(s, { type: "completed", id: "session" });
  assert.equal(s.enabled, false);
  assert.equal(s.status, "completed");
});
