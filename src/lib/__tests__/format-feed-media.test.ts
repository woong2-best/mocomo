import test from "node:test";
import assert from "node:assert/strict";
import {
  clampFeedMediaAspect,
  feedMediaFrameHeightCss,
  feedMediaFrameStyle,
  postMediaAspectRatio,
} from "@/lib/format-feed";

test("clampFeedMediaAspect crops 9:16 portrait to 3:4", () => {
  assert.equal(clampFeedMediaAspect(1080, 1920), 3 / 4);
});

test("clampFeedMediaAspect leaves 16:9 landscape unchanged", () => {
  assert.equal(clampFeedMediaAspect(1920, 1080), 1920 / 1080);
});

test("clampFeedMediaAspect leaves 16:10 landscape unchanged", () => {
  assert.equal(clampFeedMediaAspect(1600, 1000), 1.6);
});

test("clampFeedMediaAspect caps ultra-wide at 1.91", () => {
  assert.equal(clampFeedMediaAspect(4000, 1000), 1.91);
});

test("clampFeedMediaAspect defaults video to 16:9 when size is missing", () => {
  assert.equal(clampFeedMediaAspect(null, null, "VIDEO"), 16 / 9);
});

test("postMediaAspectRatio returns the clamped numeric CSS value", () => {
  assert.equal(postMediaAspectRatio({ width: 1080, height: 1920 }), String(3 / 4));
});

test("feedMediaFrameHeightCss binds to container width then 510px / 56vh", () => {
  assert.equal(feedMediaFrameHeightCss(0.75), "min(calc(100cqi / 0.75), 510px, 56vh)");
});

test("portrait photos shrink to their own ratio instead of filling the column", () => {
  const frame = feedMediaFrameStyle({ type: "IMAGE", width: 1080, height: 1920 });
  assert.equal(frame.width, "min(100%, calc(min(510px, 56vh) * 0.5625))");
  assert.equal(frame.height, "min(min(510px, 56vh), calc(100cqi / 0.5625))");
});

test("landscape photos stay full column width", () => {
  const frame = feedMediaFrameStyle({ type: "IMAGE", width: 1920, height: 1080 });
  assert.equal(frame.width, "100%");
  assert.equal(frame.height, feedMediaFrameHeightCss(1920 / 1080));
});

test("portrait videos shrink to their own ratio", () => {
  const frame = feedMediaFrameStyle({ type: "VIDEO", width: 1080, height: 1920 });
  assert.equal(frame.width, "min(100%, calc(min(510px, 56vh) * 0.5625))");
  assert.equal(frame.height, "min(min(510px, 56vh), calc(100cqi / 0.5625))");
});

test("landscape videos stay full column width", () => {
  const frame = feedMediaFrameStyle({ type: "VIDEO", width: 1920, height: 1080 });
  assert.equal(frame.width, "100%");
  assert.equal(frame.height, feedMediaFrameHeightCss(1920 / 1080));
});
