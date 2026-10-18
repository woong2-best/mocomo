import test from "node:test";
import assert from "node:assert/strict";
import {
  reelsCommentSheetHeight,
  reelsCommentSheetTranslateY,
  reelsCommentShouldClose,
  reelsCommentVideoAtProgress,
  reelsCommentVideoTransform,
} from "./reels-comment-layout";

test("sheet leaves a top slot and video scale matches that slot height", () => {
  const screen = 800;
  const sheet = reelsCommentSheetHeight(screen, 0);
  const { scale, translateY } = reelsCommentVideoTransform(screen, sheet);
  assert.ok(sheet > screen * 0.49 && sheet < screen * 0.66);
  assert.equal(Number((scale * screen).toFixed(2)), Number((screen - sheet).toFixed(2)));
  assert.equal(translateY, -sheet / 2);
});

test("progress 0 is full-screen video; progress 1 is the shrunk frame", () => {
  const screen = 900;
  const sheet = 500;
  const closed = reelsCommentVideoAtProgress(0, screen, sheet);
  const open = reelsCommentVideoAtProgress(1, screen, sheet);
  assert.equal(closed.scale, 1);
  assert.equal(Math.abs(closed.translateY), 0);
  assert.equal(open.scale, (screen - sheet) / screen);
  assert.equal(open.translateY, -sheet / 2);
  assert.equal(reelsCommentSheetTranslateY(0, sheet), sheet);
  assert.equal(reelsCommentSheetTranslateY(1, sheet), 0);
});

test("dismiss follows a fast downward flick or a half-closed sheet", () => {
  assert.equal(reelsCommentShouldClose(0.9, 1400), true);
  assert.equal(reelsCommentShouldClose(0.4, 0), true);
  assert.equal(reelsCommentShouldClose(0.8, 200), false);
});
