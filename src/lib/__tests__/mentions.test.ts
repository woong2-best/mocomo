import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  extractMentionUsernames,
  getMentionContext,
  insertMentionToken,
} from "@/lib/mention-utils";
import { parseMentionStates } from "@/lib/mentions";

describe("extractMentionUsernames", () => {
  test("dedupes case-insensitively and keeps first spelling", () => {
    assert.deepEqual(extractMentionUsernames("hi @John and @john and @jane"), [
      "John",
      "jane",
    ]);
  });

  test("ignores email-like and short handles", () => {
    assert.deepEqual(extractMentionUsernames("mail a@b.com @ab @ok_user"), ["ok_user"]);
  });
});

describe("getMentionContext", () => {
  test("activates after @ at start or after space", () => {
    assert.deepEqual(getMentionContext("@jo", 3), { query: "jo", start: 0 });
    assert.deepEqual(getMentionContext("hi @jo", 6), { query: "jo", start: 3 });
    assert.equal(getMentionContext("a@jo", 4), null);
  });
});

describe("insertMentionToken", () => {
  test("inserts @username and a trailing space", () => {
    assert.deepEqual(insertMentionToken("hi @jo", 3, 6, "john"), {
      next: "hi @john ",
      caret: 9,
    });
  });
});

describe("parseMentionStates", () => {
  test("keeps known states and lowercases keys", () => {
    assert.deepEqual(parseMentionStates({ John: "active", x: "blocked", y: "nope" }), {
      john: "active",
      x: "blocked",
    });
  });
});
