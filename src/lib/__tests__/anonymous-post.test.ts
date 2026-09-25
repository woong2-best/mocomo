import test from "node:test";
import assert from "node:assert/strict";
import {
  ANONYMOUS_AUTHOR_ID,
  ANONYMOUS_DISPLAY_NAME,
  publicQnaCommentAuthor,
  redactAnonymousPostAuthor,
  redactQnaPublicPost,
} from "@/lib/anonymous-post";
import { qnaEngagementError } from "@/lib/post-scope";

const post = {
  isAnonymous: true,
  authorId: "user_1",
  author: {
    id: "user_1",
    username: "alice",
    name: "앨리스",
    image: "https://example.com/a.png",
    supportTierSent: "GOLD",
  },
  collaborators: [{ id: "c1" }],
};

test("redactAnonymousPostAuthor hides identity from other viewers", () => {
  const out = redactAnonymousPostAuthor(post, "someone-else");
  assert.equal(out.author.id, ANONYMOUS_AUTHOR_ID);
  assert.equal(out.author.username, "anonymous");
  assert.equal(out.author.name, ANONYMOUS_DISPLAY_NAME);
  assert.equal(out.author.image, null);
  assert.equal(out.authorId, undefined);
  assert.deepEqual(out.collaborators, []);
});

test("redactAnonymousPostAuthor keeps author id for the writer so they can manage the post", () => {
  const out = redactAnonymousPostAuthor(post, "user_1");
  assert.equal(out.author.id, "user_1");
  assert.equal(out.authorId, "user_1");
  assert.equal(out.author.name, ANONYMOUS_DISPLAY_NAME);
  assert.equal(out.author.username, "anonymous");
});

test("redactAnonymousPostAuthor leaves public posts unchanged", () => {
  const publicPost = { ...post, isAnonymous: false };
  const out = redactAnonymousPostAuthor(publicPost, "someone-else");
  assert.equal(out.author.username, "alice");
  assert.equal(out.author.name, "앨리스");
});

test("QnA comment authors stay public in API payloads", () => {
  const author = post.author;
  const out = publicQnaCommentAuthor(author, "someone-else");
  assert.equal(out.username, "alice");
  assert.equal(out.name, "앨리스");
  assert.equal(out.image, "https://example.com/a.png");
});

test("QnA posts stay anonymous in public payloads even when the flag is off", () => {
  const qna = { ...post, isAnonymous: false, communityId: "c1" };
  const out = redactQnaPublicPost(qna, "someone-else");
  assert.equal(out.author.username, "anonymous");
  assert.equal(out.author.name, ANONYMOUS_DISPLAY_NAME);
  assert.equal(out.authorId, undefined);
  assert.equal(qna.authorId, "user_1");
});

test("qna engagement is rejected only for community posts", () => {
  assert.equal(qnaEngagementError(null), null);
  assert.equal(qnaEngagementError(undefined), null);
  assert.match(qnaEngagementError("community_1") ?? "", /좋아요/);
});
