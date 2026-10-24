import assert from "node:assert/strict";
import test from "node:test";
import { rootCommentId, walkReplyRoot } from "@/lib/comment-thread-root";

test("top-level reply stays on the clicked comment", () => {
  assert.equal(rootCommentId({ id: "root", parentId: null }), "root");
});

test("reply-to-reply flattens onto the root comment", () => {
  assert.equal(rootCommentId({ id: "reply", parentId: "root" }), "root");
});

test("walkReplyRoot climbs leftover nested rows to the top-level comment", () => {
  const byId = new Map([
    ["root", { id: "root", parentId: null }],
    ["mid", { id: "mid", parentId: "root" }],
    ["deep", { id: "deep", parentId: "mid" }],
  ]);
  assert.equal(walkReplyRoot("deep", byId), "root");
  assert.equal(walkReplyRoot("mid", byId), "root");
  assert.equal(walkReplyRoot("root", byId), "root");
});
