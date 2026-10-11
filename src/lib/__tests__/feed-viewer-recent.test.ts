import test from "node:test";
import assert from "node:assert/strict";
import { mergeViewerRecentIds } from "@/lib/feed-viewer-recent";

test("mergeViewerRecentIds puts own recent posts first and dedupes", () => {
  assert.deepEqual(mergeViewerRecentIds(["new-1"], ["old-1", "new-1", "old-2"], 3), [
    "new-1",
    "old-1",
    "old-2",
  ]);
});

test("mergeViewerRecentIds honors the page limit", () => {
  assert.deepEqual(mergeViewerRecentIds(["a", "b"], ["c", "d"], 2), ["a", "b"]);
});

test("mergeViewerRecentIds skips empty ids", () => {
  assert.deepEqual(mergeViewerRecentIds(["", "fresh"], ["keep"]), ["fresh", "keep"]);
});
