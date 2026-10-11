import test from "node:test";
import assert from "node:assert/strict";
import { qnaListTitle } from "../qna-list-title";

test("qnaListTitle prefers post title", () => {
  assert.equal(
    qnaListTitle({ title: "  Hello  ", content: "body", community: { name: "room" } }),
    "Hello"
  );
});

test("qnaListTitle falls back to community name then first content line", () => {
  assert.equal(qnaListTitle({ title: null, community: { name: "엄점식 고향ㅇㄷ?" } }), "엄점식 고향ㅇㄷ?");
  assert.equal(qnaListTitle({ title: " ", content: "first\nsecond" }), "first");
  assert.equal(qnaListTitle({}), "QnA");
});
