import test from "node:test";
import assert from "node:assert/strict";
import { easeOutCubic } from "./scroll-port";

test("easeOutCubic stays in 0..1 and finishes at 1", () => {
  assert.equal(easeOutCubic(0), 0);
  assert.equal(easeOutCubic(1), 1);
  assert.equal(easeOutCubic(2), 1);
  assert.equal(easeOutCubic(-1), 0);
  const mid = easeOutCubic(0.5);
  assert.ok(mid > 0.5 && mid < 1);
});
