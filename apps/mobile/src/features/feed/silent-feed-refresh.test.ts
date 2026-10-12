import test from "node:test";
import assert from "node:assert/strict";
import type { FeedItem, FeedPage, FeedPost } from "../../api/feed";
import {
  diffAndPatchFeed,
  feedHasVisiblePosts,
  feedItemKey,
  prependFeedItems,
  type InfiniteFeedData,
} from "./feed-merge";

function post(id: string, extras: Partial<FeedPost> = {}): FeedItem {
  return {
    type: "post",
    data: {
      id,
      title: null,
      content: id,
      postType: "TEXT",
      createdAt: "2026-01-01T00:00:00.000Z",
      isNsfw: false,
      author: { id: `u-${id}`, username: id, image: null },
      media: [],
      _count: { likes: extras._count?.likes ?? 0, comments: extras._count?.comments ?? 0 },
      ...extras,
    },
  };
}

function page(items: FeedItem[], nextCursor: string | null = "c1"): FeedPage {
  return {
    items,
    nextCursor,
    likedIds: [],
    starredIds: [],
    repostedIds: [],
  };
}

test("feedItemKey prefers activityKey so a repost stays distinct", () => {
  const item = post("p1", { activityKey: "repost:p1:u2" });
  assert.equal(feedItemKey(item), "repost:p1:u2");
});

test("empty cache takes the fresh page and reports no pending new items", () => {
  const fresh = page([post("a"), post("b")]);
  const { next, newItems } = diffAndPatchFeed(undefined, fresh);
  assert.equal(next.pages[0]?.items.length, 2);
  assert.equal(newItems.length, 0);
  assert.equal(feedHasVisiblePosts(next), true);
});

test("diffAndPatchFeed patches counts without reordering older pages", () => {
  const existing: InfiniteFeedData = {
    pages: [page([post("a", { _count: { likes: 1, comments: 0 } }), post("b")]), page([post("c")])],
    pageParams: [null, "c1"],
  };
  const fresh = page([
    post("new"),
    post("a", { _count: { likes: 9, comments: 2 } }),
    post("b"),
  ]);
  const { next, newItems } = diffAndPatchFeed(existing, fresh);
  assert.deepEqual(
    next.pages[0]?.items.map((item) => (item.type === "post" ? item.data.id : "")),
    ["a", "b"]
  );
  assert.equal(next.pages[0] && next.pages[0].items[0]?.type === "post" ? next.pages[0].items[0].data._count.likes : 0, 9);
  assert.equal(next.pages[1]?.items[0] && next.pages[1].items[0].type === "post" ? next.pages[1].items[0].data.id : "", "c");
  assert.deepEqual(
    newItems.map((item) => (item.type === "post" ? item.data.id : "")),
    ["new"]
  );
});

test("prependFeedItems inserts only unseen posts at the top", () => {
  const existing: InfiniteFeedData = {
    pages: [page([post("a"), post("b")])],
    pageParams: [null],
  };
  const next = prependFeedItems(existing, [post("new"), post("a")]);
  assert.deepEqual(
    next.pages[0]?.items.map((item) => (item.type === "post" ? item.data.id : "")),
    ["new", "a", "b"]
  );
});
