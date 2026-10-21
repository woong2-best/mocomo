import test from "node:test";
import assert from "node:assert/strict";
import {
  REELS_COMMENT_VIDEO_GAP,
  REELS_COMMENT_VIDEO_RADIUS,
  reelsCommentKeyboardCover,
  reelsCommentKeyboardFrame,
  reelsCommentSheetHeight,
  reelsCommentSheetTranslateY,
  reelsCommentShouldClose,
  reelsCommentVideoAtProgress,
  reelsCommentVideoTransform,
} from "./reels-comment-layout";

test("keyboard cover follows the sheet layer, not a fake window shrink", () => {
  assert.equal(reelsCommentKeyboardCover(340, 800, 800), 340);
  assert.equal(reelsCommentKeyboardCover(340, 460, 800), 0);
  assert.equal(reelsCommentKeyboardCover(348, 500, 800), 48);
  assert.equal(reelsCommentKeyboardCover(0, 800, 800), 0);
  assert.equal(reelsCommentKeyboardCover(340, 0, 800), 0);
});

test("open keyboard keeps the composer on top of the IME and inside the screen", () => {
  const frame = reelsCommentKeyboardFrame(464, 800, 800, 340);
  assert.equal(frame.lift, 340);
  assert.equal(frame.height, 800 - 340 - 36);
  assert.ok(frame.lift + frame.height <= 800);
  const closed = reelsCommentKeyboardFrame(464, 800, 800, 0);
  assert.equal(closed.lift, 0);
  assert.equal(closed.height, 464);
  const resized = reelsCommentKeyboardFrame(464, 800, 460, 0);
  assert.equal(resized.lift, 0);
  assert.equal(resized.height, 460);
});

test("sheet leaves a top slot and video scale matches that slot height", () => {
  const screen = 800;
  const sheet = reelsCommentSheetHeight(screen, 0);
  const { scale, translateY } = reelsCommentVideoTransform(screen, sheet);
  assert.ok(sheet > screen * 0.49 && sheet < screen * 0.66);
  assert.equal(
    Number((scale * screen).toFixed(2)),
    Number((screen - sheet - REELS_COMMENT_VIDEO_GAP).toFixed(2))
  );
  assert.equal(translateY, -(sheet + REELS_COMMENT_VIDEO_GAP) / 2);
});

test("progress 0 is full-screen video; progress 1 is the shrunk frame", () => {
  const screen = 900;
  const sheet = 500;
  const closed = reelsCommentVideoAtProgress(0, screen, sheet);
  const open = reelsCommentVideoAtProgress(1, screen, sheet);
  assert.equal(closed.scale, 1);
  assert.equal(Math.abs(closed.translateY), 0);
  assert.equal(closed.borderRadius, 0);
  assert.equal(open.scale, (screen - sheet - REELS_COMMENT_VIDEO_GAP) / screen);
  assert.equal(open.translateY, -(sheet + REELS_COMMENT_VIDEO_GAP) / 2);
  assert.equal(
    Number(open.borderRadius.toFixed(2)),
    Number((REELS_COMMENT_VIDEO_RADIUS / open.scale).toFixed(2))
  );
  assert.equal(reelsCommentSheetTranslateY(0, sheet), sheet);
  assert.equal(reelsCommentSheetTranslateY(1, sheet), 0);
});

test("dismiss follows a fast downward flick or a half-closed sheet", () => {
  assert.equal(reelsCommentShouldClose(0.9, 1400), true);
  assert.equal(reelsCommentShouldClose(0.4, 0), true);
  assert.equal(reelsCommentShouldClose(0.8, 200), false);
});
