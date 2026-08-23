import test from "node:test";
import assert from "node:assert/strict";
import {
  isForensicDisplaySizeReady,
  isForensicEmbedSizeReady,
  type ForensicPaintSize,
} from "@/components/media/forensic-canvas-fit";

function size(w: number, h: number): ForensicPaintSize {
  return { cssWidth: w, cssHeight: h, width: w, height: h, devicePixelRatio: 1 };
}

test("isForensicEmbedSizeReady accepts lightbox-clamped display box", () => {
  const computed = size(960, 720);
  const displayed = size(200, 150);
  assert.equal(isForensicDisplaySizeReady(computed, displayed), false);
  assert.equal(isForensicEmbedSizeReady(displayed), true);
});

test("isForensicEmbedSizeReady rejects unusably small display box", () => {
  assert.equal(isForensicEmbedSizeReady(size(120, 90)), false);
  assert.equal(isForensicEmbedSizeReady(size(200, 150)), true);
});
