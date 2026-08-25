import test from "node:test";
import assert from "node:assert/strict";
import { forensicModulationScaleForSize } from "@/lib/watermark/encoder/spread-spectrum";

test("forensicModulationScaleForSize boosts only at 320px pixel budget floor", () => {
  assert.equal(forensicModulationScaleForSize(960, 540), 1);
  assert.equal(forensicModulationScaleForSize(640, 360), 1);
  assert.equal(forensicModulationScaleForSize(400, 400), 1);
  assert.equal(forensicModulationScaleForSize(360, 360), 1);
  assert.ok(forensicModulationScaleForSize(320, 320) > 1);
  assert.ok(forensicModulationScaleForSize(320, 320) <= 1.2);
});
