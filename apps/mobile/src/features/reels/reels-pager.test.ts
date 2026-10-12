import test from "node:test";
import assert from "node:assert/strict";
import {
  clampPageIndex,
  isPageAligned,
  pageIndexFromOffset,
  pageOffsetDrift,
  pageOffsetForIndex,
  shouldWaitForMomentum,
} from "./reels-pager";

test("page index rounds to the nearest reel", () => {
  assert.equal(pageIndexFromOffset(0, 800, 5), 0);
  assert.equal(pageIndexFromOffset(399, 800, 5), 0);
  assert.equal(pageIndexFromOffset(400, 800, 5), 1);
  assert.equal(pageIndexFromOffset(1600, 800, 5), 2);
});

test("page index stays inside the list", () => {
  assert.equal(pageIndexFromOffset(-80, 800, 3), 0);
  assert.equal(pageIndexFromOffset(9999, 800, 3), 2);
  assert.equal(clampPageIndex(-1, 4), 0);
  assert.equal(clampPageIndex(8, 4), 3);
  assert.equal(pageIndexFromOffset(100, 800, 0), 0);
});

test("drift detects a reel stuck between two pages", () => {
  assert.equal(pageOffsetForIndex(2, 844), 1688);
  assert.ok(pageOffsetDrift(400, 800, 5) > 1.5);
  assert.equal(isPageAligned(800, 800, 5), true);
  assert.equal(isPageAligned(400, 800, 5), false);
});

test("low residual velocity means snap now", () => {
  assert.equal(shouldWaitForMomentum(0), false);
  assert.equal(shouldWaitForMomentum(0.04), false);
  assert.equal(shouldWaitForMomentum(undefined), false);
  assert.equal(shouldWaitForMomentum(0.4), true);
  assert.equal(shouldWaitForMomentum(-0.5), true);
});
