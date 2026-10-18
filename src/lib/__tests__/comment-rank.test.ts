import test from "node:test";
import assert from "node:assert/strict";
import {
  commentIsPromoted,
  commentRankScore,
  pickRankedTopIds,
  usesFeedCommentRanking,
} from "@/lib/comment-rank";

const now = Date.UTC(2026, 9, 18);

test("QnA community posts do not use feed ranking", () => {
  assert.equal(usesFeedCommentRanking("comm_1"), false);
  assert.equal(usesFeedCommentRanking(null), true);
  assert.equal(usesFeedCommentRanking(undefined), true);
});

test("plain new comments are not promoted into the top band", () => {
  assert.equal(
    commentIsPromoted({
      likeCount: 0,
      replyCount: 0,
      likedByAuthor: false,
      authorReplied: false,
      followedAuthor: false,
      createdAtMs: now,
      nowMs: now,
    }),
    false
  );
});

test("author replies and likes outrank raw recency", () => {
  const engaged = commentRankScore({
    likeCount: 2,
    replyCount: 3,
    likedByAuthor: true,
    authorReplied: true,
    followedAuthor: false,
    createdAtMs: now - 48 * 3_600_000,
    nowMs: now,
  });
  const fresh = commentRankScore({
    likeCount: 1,
    replyCount: 0,
    likedByAuthor: false,
    authorReplied: false,
    followedAuthor: false,
    createdAtMs: now,
    nowMs: now,
  });
  assert.ok(engaged > fresh);
});

test("pickRankedTopIds keeps promoted comments and drops cold ones", () => {
  const ids = pickRankedTopIds(
    [
      { id: "cold", likeCount: 0, replyCount: 0 },
      { id: "hot", likeCount: 9, replyCount: 1 },
      { id: "thread", likeCount: 1, replyCount: 8 },
    ],
    (row) => ({
      likeCount: row.likeCount,
      replyCount: row.replyCount,
      likedByAuthor: false,
      authorReplied: false,
      followedAuthor: false,
      createdAtMs: now,
      nowMs: now,
    }),
    12
  );
  assert.deepEqual(ids, ["thread", "hot"]);
});
