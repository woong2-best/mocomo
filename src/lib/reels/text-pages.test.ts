import test from "node:test";
import assert from "node:assert/strict";
import {
  groupReelSlides,
  paginateReelNote,
  reelNotePages,
  wrapReelNoteLine,
} from "./text-pages";

test("keeps author line breaks on one short note", () => {
  const pages = paginateReelNote("한 줄\n\n다음 줄");
  assert.equal(pages.length, 1);
  assert.equal(pages[0], "한 줄\n\n다음 줄");
});

test("wraps a long latin line and starts another page when the frame is full", () => {
  const line = "word ".repeat(80).trim();
  const wrapped = wrapReelNoteLine(line);
  assert.ok(wrapped.length > 1);
  for (const row of wrapped) {
    assert.ok(row.length <= 32);
  }
  const pages = paginateReelNote(line);
  assert.ok(pages.length > 1);
  for (const page of pages) {
    assert.ok(page.split("\n").length <= 11);
  }
});

test("wraps Korean sooner than latin", () => {
  const hangul = "가".repeat(40);
  const wrapped = wrapReelNoteLine(hangul);
  assert.ok(wrapped.length >= 3);
  assert.ok(wrapped.every((row) => Array.from(row).length <= 16));
});

test("puts the title above the body", () => {
  const pages = reelNotePages("제목", "본문");
  assert.equal(pages[0], "제목\n\n본문");
});

test("empty text has no note page", () => {
  assert.deepEqual(paginateReelNote("  \n\n"), []);
  assert.deepEqual(reelNotePages(null, "   "), []);
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
