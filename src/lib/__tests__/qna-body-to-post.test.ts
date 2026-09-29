import test from "node:test";
import assert from "node:assert/strict";
import { qnaBodyToPost } from "@/lib/qna-body-to-post";

test("qnaBodyToPost extracts image URLs into media and strips them from content", () => {
  const url = "https://cdn.example.com/a.jpg";
  const { content, media } = qnaBodyToPost("질문 제목", `설명 텍스트\n\n${url}`);
  assert.equal(content, "설명 텍스트");
  assert.equal(media.length, 1);
  assert.equal(media[0]?.url, url);
  assert.equal(media[0]?.type, "IMAGE");
});

test("qnaBodyToPost falls back to name when description is only images", () => {
  const { content, media } = qnaBodyToPost("질문", "https://cdn.example.com/x.png");
  assert.equal(content, "질문");
  assert.equal(media.length, 1);
});
