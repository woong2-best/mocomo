import test from "node:test";
import assert from "node:assert/strict";
import {
  clampReelPinchScale,
  REEL_PINCH_COMMIT,
  REEL_PINCH_MAX,
  REEL_PINCH_MIN,
  reelCommittedVisualScale,
  reelFillPhoneScale,
  reelPinchOffset,
  reelPinchShouldCommit,
  REEL_GESTURE_SLOP,
  REEL_HOLD_MS,
  reelSurfaceIntent,
} from "./reel-pinch-zoom";

test("pinch scale rubber-bands below 1 and caps at max", () => {
  assert.equal(clampReelPinchScale(1), 1);
  assert.equal(clampReelPinchScale(0.2), REEL_PINCH_MIN);
  assert.equal(clampReelPinchScale(12), REEL_PINCH_MAX);
});

test("instagram surface: pinch beats swipe, swipe beats hold, hold beats tap", () => {
  assert.equal(
    reelSurfaceIntent({ pointers: 2, distance: 40, heldMs: 400, released: false }),
    "pinch"
  );
  assert.equal(
    reelSurfaceIntent({ pointers: 1, distance: REEL_GESTURE_SLOP + 1, heldMs: 400, released: false }),
    "swipe"
  );
  assert.equal(
    reelSurfaceIntent({ pointers: 1, distance: 2, heldMs: REEL_HOLD_MS, released: false }),
    "fast"
  );
  assert.equal(
    reelSurfaceIntent({ pointers: 1, distance: 2, heldMs: 80, released: true }),
    "tap"
  );
  assert.equal(
    reelSurfaceIntent({ pointers: 1, distance: 2, heldMs: 80, released: false }),
    "pending"
  );
});

test("one finger never commits a pinch", () => {
  assert.equal(reelPinchShouldCommit(2, 1), false);
  assert.equal(reelPinchShouldCommit(1.01, 2), false);
  assert.equal(reelPinchShouldCommit(REEL_PINCH_COMMIT, 2), true);
});

test("16:9 contain in a 9:16 phone fills the whole phone when zoomed", () => {
  const phoneW = 390;
  const phoneH = 844;
  const boost = reelFillPhoneScale(1920, 1080, phoneW, phoneH, phoneW, phoneH);
  assert.ok(boost > 1.7);
  const visual = reelCommittedVisualScale(REEL_PINCH_COMMIT, boost);
  assert.ok(Math.abs(visual - boost) < 0.02);
});

test("pinch offset keeps the focal point while scaling from center", () => {
  const atRest = reelPinchOffset(1, 100, 200, 100, 200, 180, 400);
  assert.equal(atRest.x, 0);
  assert.equal(atRest.y, 0);

  const zoomed = reelPinchOffset(2, 100, 200, 100, 200, 180, 400);
  assert.equal(zoomed.x, (1 - 2) * (100 - 180));
  assert.equal(zoomed.y, (1 - 2) * (200 - 400));

  const panned = reelPinchOffset(2, 100, 200, 130, 240, 180, 400);
  assert.equal(panned.x, zoomed.x + 30);
  assert.equal(panned.y, zoomed.y + 40);
});
