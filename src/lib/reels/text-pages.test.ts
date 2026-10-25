import test from "node:test";
import assert from "node:assert/strict";
import {
  expandReelNoteSlides,
  groupReelSlides,
  notePageBudget,
  paginateReelNote,
  reelNotePages,
  wrapReelNoteLine,
} from "./text-pages";

test("keeps author line breaks on one short note", () => {
  const pages = paginateReelNote("한 줄\n\n다음 줄", { unitsPerLine: 32, linesPerPage: 11 });
  assert.equal(pages.length, 1);
  assert.equal(pages[0], "한 줄\n\n다음 줄");
});

test("wraps a long latin line and starts another page when the frame is full", () => {
  const line = "word ".repeat(80).trim();
  const wrapped = wrapReelNoteLine(line, 32);
  assert.ok(wrapped.length > 1);
  for (const row of wrapped) {
    assert.ok(row.length <= 32);
  }
  const pages = paginateReelNote(line, { unitsPerLine: 32, linesPerPage: 11 });
  assert.ok(pages.length > 1);
  for (const page of pages) {
    assert.ok(page.split("\n").length <= 11);
  }
});

test("wraps Korean sooner than latin", () => {
  const hangul = "가".repeat(40);
  const wrapped = wrapReelNoteLine(hangul, 32);
  assert.ok(wrapped.length >= 3);
  assert.ok(wrapped.every((row) => Array.from(row).length <= 16));
});

test("a tall reel packs each line to the rail and the page to the author", () => {
  const budget = notePageBudget(420, 860);
  assert.equal(budget.linesPerPage, 23);
  assert.equal(budget.lineWidthPx, 368);
  const pages = paginateReelNote("ㅇ".repeat(600), budget);
  assert.ok(pages.length > 1);
  const lines = pages[0]!.split("\n");
  assert.equal(lines.length, budget.linesPerPage);
  assert.equal(Array.from(lines[0]!).length, 25);
  const width = 25 * 14.7;
  assert.ok(width <= (budget.lineWidthPx ?? 0));
});

test("a shorter frame fits fewer lines so text is not clipped", () => {
  const budget = notePageBudget(390, 640);
  assert.ok(budget.linesPerPage < 22);
  assert.ok(budget.linesPerPage >= 8);
  const page = paginateReelNote("가".repeat(400), budget)[0]!;
  assert.equal(page.split("\n").length, budget.linesPerPage);
});

test("puts the title above the body", () => {
  const pages = reelNotePages("제목", "본문");
  assert.equal(pages[0], "제목\n\n본문");
});

test("empty text has no note page", () => {
  assert.deepEqual(paginateReelNote("  \n\n"), []);
  assert.deepEqual(reelNotePages(null, "   "), []);
});

test("expands one full note into pages and leaves photos in place", () => {
  const slides = expandReelNoteSlides(
    [
      { id: "img", mediaType: "IMAGE" },
      { id: "note", mediaType: "NOTE", noteText: "ㅇ".repeat(200) },
    ],
    { unitsPerLine: 32, linesPerPage: 4 }
  );
  assert.equal(slides[0]?.id, "img");
  assert.equal(slides[1]?.id, "note");
  assert.ok(slides.length > 2);
  assert.equal(slides[2]?.id, "note:p1");
  assert.equal(slides[1]?.noteText?.split("\n").length, 4);
});

test("groups consecutive slides that share a run", () => {
  const groups = groupReelSlides([
    { postId: "a", runId: "a", id: "1" },
    { postId: "a", runId: "a", id: "2" },
    { postId: "b", runId: "b", id: "3" },
    { postId: "a", runId: "a:loop1", id: "4" },
  ]);
  assert.deepEqual(
    groups.map((g) => g.slides.map((s) => s.id)),
    [["1", "2"], ["3"], ["4"]]
  );
});
