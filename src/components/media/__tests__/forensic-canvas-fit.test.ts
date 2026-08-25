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
  const displayed = size(320, 240);
  assert.equal(isForensicDisplaySizeReady(computed, displayed), false);
  assert.equal(isForensicEmbedSizeReady(displayed), true);
});

test("isForensicEmbedSizeReady rejects display below verify minimum", () => {
  assert.equal(isForensicEmbedSizeReady(size(280, 210)), false);
  assert.equal(isForensicEmbedSizeReady(size(320, 240)), true);
});

test("fitIntrinsicSize allowUpscale fills viewport for small sources", async () => {
  const { resolveForensicPaintSize } = await import("@/components/media/forensic-canvas-fit");
  const wrap = {
    clientWidth: 960,
    clientHeight: 720,
    offsetWidth: 960,
    offsetHeight: 720,
    parentElement: null,
  } as unknown as HTMLElement;
  const painted = resolveForensicPaintSize(wrap, 320, 320, "contain", {
    fillParent: true,
    allowUpscale: true,
  });
  assert.ok(painted);
  assert.ok(painted!.cssWidth >= 480);
  assert.ok(painted!.cssHeight >= 480);
});
