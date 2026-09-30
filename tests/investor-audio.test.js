import test from "node:test";
import assert from "node:assert/strict";
import { createInvestorAudio } from "../src/practice/investor-audio.js";

function fixture() {
  const clips = [];
  const spoken = [];
  const errors = [];
  const player = createInvestorAudio({
    createAudio(src) {
      const clip = {
        src,
        paused: false,
        released: false,
        play() {
          return new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
          });
        },
        pause() {
          this.paused = true;
        },
        removeAttribute(name) {
          if (name === "src") this.src = null;
        },
        load() {
          this.released = true;
        },
      };
      clips.push(clip);
      return clip;
    },
    synthesis: {
      getVoices: () => [],
      speak: (utterance) => spoken.push(utterance),
      cancel: () => {},
    },
    createUtterance: (text) => ({ text }),
  });
  const play = (src) =>
    player.play({
      text: "Вопрос",
      language: "ru",
      src,
      onError: (e) => errors.push(e),
    });
  return { player, play, clips, spoken, errors };
}

test("mute releases a pending recording and ignores its late rejection", async () => {
  const f = fixture();
  f.play("/question.mp3");
  f.player.stop();
  f.clips[0].reject(new DOMException("Blocked", "NotAllowedError"));
  await Promise.resolve();
  assert.equal(f.clips[0].paused, true);
  assert.equal(f.clips[0].released, true);
  assert.equal(f.clips[0].src, null);
  assert.deepEqual(f.errors, []);
  assert.deepEqual(f.spoken, []);
});

test("replay and next question replace audio; stale events cannot stop the new line", async () => {
  const f = fixture();
  f.play("/first.mp3");
  const staleEnd = f.clips[0].onended;
  const staleError = f.clips[0].onerror;
  f.play("/second.mp3");
  staleEnd();
  staleError();
  f.clips[0].reject(new Error("Late failure"));
  await Promise.resolve();
  assert.equal(f.clips[0].paused, true);
  assert.equal(f.clips[1].paused, false);
  assert.deepEqual(f.errors, []);
  f.clips[1].onended();
  assert.equal(f.clips[1].released, true);
});

test("blocked playback reports a retryable error without starting a second voice", async () => {
  const f = fixture();
  f.play("/question.mp3");
  f.clips[0].reject(new DOMException("Blocked", "NotAllowedError"));
  await Promise.resolve();
  assert.deepEqual(f.errors, ["blocked"]);
  assert.deepEqual(f.spoken, []);
  assert.equal(f.clips[0].paused, true);
  f.play("/question.mp3");
  assert.equal(f.clips.length, 2);
});

test("missing recording reports one error; unrecorded questions use the exact text", async () => {
  const f = fixture();
  f.play("/missing.mp3");
  const fail = f.clips[0].onerror;
  fail();
  f.clips[0].reject(new Error("Missing"));
  await Promise.resolve();
  assert.deepEqual(f.errors, ["unavailable"]);
  f.play();
  assert.equal(f.spoken[0].text, "Вопрос");
  assert.equal(f.spoken[0].lang, "ru-RU");
  f.player.stop();
  f.spoken[0].onerror({ error: "synthesis-failed" });
  assert.deepEqual(f.errors, ["unavailable"]);
});
