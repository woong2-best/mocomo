import test from "node:test";
import assert from "node:assert/strict";
import { parseQnaCategoryParam, qnaFeedWhere } from "@/lib/qna-feed-query";

test("parseQnaCategoryParam treats empty and ALL as every category", () => {
  assert.equal(parseQnaCategoryParam(null), null);
  assert.equal(parseQnaCategoryParam("ALL"), null);
  assert.equal(parseQnaCategoryParam(""), null);
});

test("parseQnaCategoryParam accepts current taxonomy and maps legacy ids", () => {
  assert.equal(parseQnaCategoryParam("GAME"), "GAME");
  assert.equal(parseQnaCategoryParam("ANIME"), "SUBCULTURE");
});

test("parseQnaCategoryParam accepts NSFW hub tab", () => {
  assert.equal(parseQnaCategoryParam("NSFW"), "NSFW");
});

test("parseQnaCategoryParam rejects unknown values", () => {
  assert.equal(parseQnaCategoryParam("not-a-category"), null);
});

test("qnaFeedWhere always scopes to public community posts", () => {
  const where = qnaFeedWhere({ category: null, q: "", canViewNsfw: false });
  assert.deepEqual(where.communityId, { not: null });
  assert.equal(where.visibility, "PUBLIC");
  assert.equal(where.isNsfw, false);
});

test("qnaFeedWhere filters by category and search when provided", () => {
  const where = qnaFeedWhere({ category: "GAME", q: "원신", canViewNsfw: true });
  assert.equal((where.community as { category?: string } | undefined)?.category, "GAME");
  assert.ok(Array.isArray(where.OR));
});

test("qnaFeedWhere NSFW tab requires adult viewer and scopes to nsfw posts", () => {
  const denied = qnaFeedWhere({ category: "NSFW", q: "", canViewNsfw: false });
  assert.equal(denied.id, "__qna_nsfw_denied__");
  const allowed = qnaFeedWhere({ category: "NSFW", q: "", canViewNsfw: true });
  assert.equal(allowed.isNsfw, true);
  assert.equal((allowed.community as { isNsfw?: boolean })?.isNsfw, true);
});

test("qnaFeedWhere does not match anonymous posts by author name", () => {
  const where = qnaFeedWhere({ category: null, q: "alice", canViewNsfw: true });
  const or = where.OR as Array<Record<string, unknown>>;
  const authorClauses = or.filter((clause) => "AND" in clause) as Array<{
    AND: Array<Record<string, unknown>>;
  }>;
  assert.equal(authorClauses.length, 2);
  for (const clause of authorClauses) {
    assert.equal(clause.AND.some((part) => part.isAnonymous === false), true);
  }
});
