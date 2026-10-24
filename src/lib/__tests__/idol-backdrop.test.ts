import test from "node:test";
import assert from "node:assert/strict";
import {
  IDOL_BACKDROP_DEFAULTS,
  effectiveIdolBackdropMap,
  effectiveIdolBackdropUrl,
  isIdolBackdropSlot,
  isSafeIdolBackdropUrl,
  parseIdolBackdropValue,
} from "@/lib/ai-live/idol-backdrop-shared";

test("idol backdrop slots and defaults", () => {
  assert.equal(isIdolBackdropSlot("airi"), true);
  assert.equal(isIdolBackdropSlot("moco"), true);
  assert.equal(isIdolBackdropSlot("room"), false);
  assert.equal(IDOL_BACKDROP_DEFAULTS.airi, "/live/backgrounds/airi-room.jpg");
  assert.equal(IDOL_BACKDROP_DEFAULTS.chloe, "/live/backgrounds/chloe-room.jpg");
  assert.equal(IDOL_BACKDROP_DEFAULTS.moco, "/live/backgrounds/moco-room.jpg");
  assert.equal(IDOL_BACKDROP_DEFAULTS.stella, "/live/backgrounds/nangnang-room.jpg");
});

test("default backdrop paths are safe and used when nothing is uploaded", () => {
  assert.equal(isSafeIdolBackdropUrl("/live/backgrounds/airi-room.jpg"), true);
  assert.equal(isSafeIdolBackdropUrl("/live/backgrounds/nangnang-room.jpg"), true);
  assert.equal(effectiveIdolBackdropUrl("airi", null), "/live/backgrounds/airi-room.jpg");
  assert.equal(effectiveIdolBackdropUrl("stella", null), "/live/backgrounds/nangnang-room.jpg");
  const map = effectiveIdolBackdropMap({ moco: null, airi: null, chloe: null, stella: null });
  assert.equal(map.airi, IDOL_BACKDROP_DEFAULTS.airi);
  assert.equal(map.chloe, IDOL_BACKDROP_DEFAULTS.chloe);
});

test("stored values only keep custom https storage urls", () => {
  const parsed = parseIdolBackdropValue({
    airi: "/live/backgrounds/airi-room.jpg",
    chloe: "https://evil.example/hack.jpg",
    moco: null,
  });
  assert.equal(parsed.airi, null);
  assert.equal(parsed.chloe, null);
  assert.equal(parsed.moco, null);
  assert.equal(parsed.stella, null);
});
