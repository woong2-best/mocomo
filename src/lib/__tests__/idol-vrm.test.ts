import test from "node:test";
import assert from "node:assert/strict";
import {
  IDOL_VRM_DEFAULTS,
  effectiveIdolVrmMap,
  effectiveIdolVrmUrl,
  isGltfBinary,
  isIdolVrmSlot,
  isSafeIdolVrmUrl,
  parseIdolVrmValue,
  vrmSlotForAvatar,
} from "@/lib/ai-live/idol-vrm-shared";

test("idol vrm slots and defaults", () => {
  assert.equal(isIdolVrmSlot("zelie"), true);
  assert.equal(isIdolVrmSlot("cleo"), true);
  assert.equal(isIdolVrmSlot("room"), false);
  assert.equal(vrmSlotForAvatar("moco"), "zelie");
  assert.equal(vrmSlotForAvatar("AIRI"), "cleo");
  assert.equal(IDOL_VRM_DEFAULTS.zelie, "/avatars/zelie.vrm");
  assert.equal(IDOL_VRM_DEFAULTS.cleo, "/models/airi.vrm");
  assert.equal(IDOL_VRM_DEFAULTS.mio, "/models/chloe.vrm");
  assert.equal(IDOL_VRM_DEFAULTS.nangnang, "/models/nangnang.vrm");
});

test("default vrm paths are safe and used when nothing is uploaded", () => {
  assert.equal(isSafeIdolVrmUrl("/avatars/zelie.vrm"), true);
  assert.equal(isSafeIdolVrmUrl("/models/airi.vrm"), true);
  assert.equal(effectiveIdolVrmUrl("zelie", null), "/avatars/zelie.vrm");
  assert.equal(effectiveIdolVrmUrl("nangnang", null), "/models/nangnang.vrm");
  const map = effectiveIdolVrmMap({ zelie: null, cleo: null, mio: null, nangnang: null });
  assert.equal(map.zelie, IDOL_VRM_DEFAULTS.zelie);
  assert.equal(map.cleo, IDOL_VRM_DEFAULTS.cleo);
});

test("stored values only keep custom https storage urls", () => {
  const parsed = parseIdolVrmValue({
    zelie: "/avatars/zelie.vrm",
    cleo: "https://evil.example/hack.vrm",
    mio: null,
  });
  assert.equal(parsed.zelie, null);
  assert.equal(parsed.cleo, null);
  assert.equal(parsed.mio, null);
  assert.equal(parsed.nangnang, null);
});

test("gltf binary magic is required for vrm files", () => {
  assert.equal(isGltfBinary(Buffer.from("glTF........")), true);
  assert.equal(isGltfBinary(Buffer.from("PK\u0003\u0004")), false);
});
