import test from "node:test";
import assert from "node:assert/strict";
import { reelShouldHoldSrc } from "@/lib/reels/attach-policy";

test("does not start a new src while the scroller is flinging", () => {
  assert.equal(
    reelShouldHoldSrc({ distance: 0, settled: false, alreadyAttached: false }),
    false
  );
  assert.equal(
    reelShouldHoldSrc({ distance: 1, settled: false, alreadyAttached: false }),
    false
  );
});

test("attaches the active and neighbor after the scroller rests", () => {
  assert.equal(
    reelShouldHoldSrc({ distance: 0, settled: true, alreadyAttached: false }),
    true
  );
  assert.equal(
    reelShouldHoldSrc({ distance: 1, settled: true, alreadyAttached: false }),
    true
  );
  assert.equal(
    reelShouldHoldSrc({ distance: 2, settled: true, alreadyAttached: false }),
    false
  );
});

test("keeps a nearby attached src during the fling so playback does not abort", () => {
  assert.equal(
    reelShouldHoldSrc({ distance: 0, settled: false, alreadyAttached: true }),
    true
  );
  assert.equal(
    reelShouldHoldSrc({ distance: 1, settled: false, alreadyAttached: true }),
    true
  );
  assert.equal(
    reelShouldHoldSrc({ distance: 2, settled: false, alreadyAttached: true }),
    false
  );
});
