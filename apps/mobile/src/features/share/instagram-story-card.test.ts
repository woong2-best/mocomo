import assert from "node:assert/strict";
import test from "node:test";
import { storyCardText } from "./story-card-text";

test("storyCardText prefers title plus body when they differ", () => {
  assert.equal(storyCardText({ title: "Hello", content: "World" }), "Hello\nWorld");
});

test("storyCardText trims long body", () => {
  const text = storyCardText({ content: "a".repeat(240) });
  assert.equal(text.endsWith("…"), true);
  assert.ok(text.length <= 180);
});
