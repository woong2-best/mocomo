import test from "node:test";
import assert from "node:assert/strict";
import { isTextWorthTranslating } from "@/lib/translate-text-filter";

test("isTextWorthTranslating rejects Korean jamo laughter", () => {
  assert.equal(isTextWorthTranslating("ㅋㅋㅋ"), false);
  assert.equal(isTextWorthTranslating("ㅋㅋㅋㅎㅎㅎ"), false);
  assert.equal(isTextWorthTranslating("ㅎㅎ ㅋㅋ"), false);
});

test("isTextWorthTranslating rejects meaningless latin repetition", () => {
  assert.equal(isTextWorthTranslating("jjjjjaa"), false);
  assert.equal(isTextWorthTranslating("loooool"), false);
  assert.equal(isTextWorthTranslating("aaaa"), false);
});

test("isTextWorthTranslating rejects emoji-only and special-char-only text", () => {
  assert.equal(isTextWorthTranslating("😂😂😂"), false);
  assert.equal(isTextWorthTranslating("!!!"), false);
  assert.equal(isTextWorthTranslating("..."), false);
  assert.equal(isTextWorthTranslating("???"), false);
});

test("isTextWorthTranslating rejects excessively short text", () => {
  assert.equal(isTextWorthTranslating("a"), false);
  assert.equal(isTextWorthTranslating("!"), false);
});

test("isTextWorthTranslating accepts meaningful sentences", () => {
  assert.equal(isTextWorthTranslating("안녕하세요"), true);
  assert.equal(isTextWorthTranslating("Hello world"), true);
  assert.equal(isTextWorthTranslating("今日はいい天気"), true);
  assert.equal(isTextWorthTranslating("ㅋㅋㅋ but this is a real sentence"), true);
  assert.equal(isTextWorthTranslating("good morning everyone"), true);
});

test("isTextWorthTranslating ignores URLs and mentions when judging content", () => {
  assert.equal(isTextWorthTranslating("https://example.com"), false);
  assert.equal(isTextWorthTranslating("https://example.com hello there"), true);
  assert.equal(isTextWorthTranslating("@user #tag"), false);
});
