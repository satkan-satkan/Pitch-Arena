import test from "node:test";
import assert from "node:assert/strict";
import { lockBodyScroll } from "../src/browser/scroll-lock.js";
const body = (value = "", priority = "") => ({
  style: {
    value,
    priority,
    getPropertyValue() {
      return this.value;
    },
    getPropertyPriority() {
      return this.priority;
    },
    setProperty(k, v, p = "") {
      this.value = v;
      this.priority = p;
    },
    removeProperty() {
      this.value = "";
      this.priority = "";
    },
  },
});
test("Overlapping room and dialogs can close in either order without stranding page scrolling", () => {
  for (const order of [
    [0, 1],
    [1, 0],
  ]) {
    const b = body();
    const release = [lockBodyScroll(b), lockBodyScroll(b)];
    release[order[0]]();
    assert.equal(b.style.value, "hidden");
    release[order[0]]();
    assert.equal(b.style.value, "hidden");
    release[order[1]]();
    assert.equal(b.style.value, "");
  }
});
test("Overlay cleanup preserves the original scroll style and priority", () => {
  const b = body("auto", "important");
  const release = lockBodyScroll(b);
  assert.equal(b.style.value, "hidden");
  release();
  assert.equal(b.style.value, "auto");
  assert.equal(b.style.priority, "important");
});
