import test from "node:test";
import assert from "node:assert/strict";
import {
  clampReelPinchScale,
  REEL_PINCH_MAX,
  REEL_PINCH_MIN,
  reelPinchOffset,
} from "./reel-pinch-zoom";

test("pinch scale rubber-bands below 1 and caps at max", () => {
  assert.equal(clampReelPinchScale(1), 1);
  assert.equal(clampReelPinchScale(0.2), REEL_PINCH_MIN);
  assert.equal(clampReelPinchScale(12), REEL_PINCH_MAX);
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
