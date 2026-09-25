import test from "node:test";
import assert from "node:assert/strict";
import { galleryAuthorLabel } from "@/lib/community-author";
import { filterCommunityPostsByTab, type CommunityPostsBoardItem } from "@/lib/community-posts-board";

test("galleryAuthorLabel puts the account id in parentheses like DC IP", () => {
  assert.equal(galleryAuthorLabel("앨리스", "alice"), "앨리스 (alice)");
  assert.equal(galleryAuthorLabel(null, "bob"), "bob (bob)");
  assert.equal(galleryAuthorLabel("앨리스", "alice", true), "익명");
});

test("concept tab keeps only high-recommend posts", () => {
  const posts: CommunityPostsBoardItem[] = [
    {
      id: "1",
      title: "hot",
      content: "x",
      isPinned: false,
      viewCount: 1,
      likeCount: 12,
      commentCount: 0,
      createdAt: new Date().toISOString(),
      authorUsername: "a",
      authorName: "A",
    },
    {
      id: "2",
      title: "cold",
      content: "y",
      isPinned: false,
      viewCount: 1,
      likeCount: 1,
      commentCount: 0,
      createdAt: new Date().toISOString(),
      authorUsername: "b",
      authorName: "B",
    },
  ];
  assert.deepEqual(
    filterCommunityPostsByTab(posts, "concept").map((p) => p.id),
    ["1"]
  );
});
