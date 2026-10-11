import test from "node:test";
import assert from "node:assert/strict";
import {
  GENERAL_POST_MAX_GRAPHEMES,
  GENERAL_POST_TOO_LONG_ERROR,
  countGraphemeClusters,
  remainingGeneralPostGraphemes,
  validateGeneralPostContentLength,
} from "@/lib/post-content-limit";

test("spaces, newlines, and punctuation each count as 1", () => {
  assert.equal(countGraphemeClusters("a b"), 3);
  assert.equal(countGraphemeClusters("a\nb"), 3);
  assert.equal(countGraphemeClusters("hi!"), 3);
});

test("simple emoji and combining marks count as 1 visible character", () => {
  assert.equal(countGraphemeClusters("👋"), 1);
  assert.equal(countGraphemeClusters("e\u0301"), 1);
});

test("ZWJ family, skin tone, and flag emoji count as 1", () => {
  assert.equal(countGraphemeClusters("👨‍👩‍👧‍👦"), 1);
  assert.equal(countGraphemeClusters("👍🏻"), 1);
  assert.equal(countGraphemeClusters("🇰🇷"), 1);
});

test("350 graphemes is allowed; 351 is rejected for general posts only", () => {
  const ok = "한".repeat(GENERAL_POST_MAX_GRAPHEMES);
  const over = `${ok}가`;
  assert.equal(countGraphemeClusters(ok), 350);
  assert.equal(remainingGeneralPostGraphemes(ok), 0);
  assert.equal(remainingGeneralPostGraphemes(over), -1);
  assert.equal(validateGeneralPostContentLength(ok, null), null);
  assert.equal(
    validateGeneralPostContentLength(over, null),
    GENERAL_POST_TOO_LONG_ERROR
  );
  assert.equal(
    validateGeneralPostContentLength(over, "qna-community-id"),
    null
  );
});
