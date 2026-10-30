import test from "node:test";
import assert from "node:assert/strict";
import {
  NOTE_CHROME_BELOW_INSET_PX,
  NOTE_LINE_PX,
  NOTE_PAD_BOTTOM_PX,
  NOTE_PAD_LEFT_PX,
  NOTE_PAD_RIGHT_PX,
  notePageBudget,
  noteSafePads,
  paginateReelNote,
} from "./reel-note-pages";

test("text reels sit below the back button and left of the action rail", () => {
  const pads = noteSafePads(47);
  assert.equal(pads.top, 47 + NOTE_CHROME_BELOW_INSET_PX);
  assert.equal(pads.right, NOTE_PAD_RIGHT_PX);
  assert.equal(pads.bottom, NOTE_PAD_BOTTOM_PX);
  assert.equal(pads.left, NOTE_PAD_LEFT_PX);
  assert.ok(pads.top >= 100);
  assert.ok(pads.right >= 96);
  assert.ok(pads.bottom >= 100);
});

test("a digit run wraps before the action rail", () => {
  const pads = noteSafePads(47);
  const budget = notePageBudget(390, 844, pads);
  const wrapped = paginateReelNote("1".repeat(40), budget);
  const longest = Math.max(...wrapped.flatMap((page) => page.split("\n").map((row) => row.length)));
  assert.ok((longest * 11.6) <= (budget.lineWidthPx ?? 0) + 0.01);
  assert.ok((budget.lineWidthPx ?? 0) <= 390 - 96 - 20);
});

test("pagination uses the chrome-safe box so a page cannot reach the overlays", () => {
  const pads = noteSafePads(47);
  const budget = notePageBudget(390, 844, pads);
  assert.equal(budget.lineWidthPx, 390 - NOTE_PAD_LEFT_PX - NOTE_PAD_RIGHT_PX);
  assert.ok((budget.linesPerPage ?? 0) * NOTE_LINE_PX <= 844 - pads.top - pads.bottom);
  const page = paginateReelNote("가".repeat(400), budget)[0]!;
  assert.equal(page.split("\n").length, budget.linesPerPage);
});
