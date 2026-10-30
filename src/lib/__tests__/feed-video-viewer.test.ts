import test from "node:test";
import assert from "node:assert/strict";
import type { FeedLayoutItem } from "@/components/feed/feed-dual-column-layout";
import { buildFeedVideoGroups } from "@/lib/feed-video-viewer";

function postItem(data: Record<string, unknown>): FeedLayoutItem {
  return {
    type: "post",
    data: {
      createdAt: "2026-01-01T00:00:00.000Z",
      isNsfw: false,
      author: {
        id: "u1",
        username: "baek",
        name: "백권웅",
        image: null,
        supportTierSent: "SEED",
      },
      ...data,
    },
  } as FeedLayoutItem;
}

test("media plus caption stays on the photo — no extra note slide", () => {
  const groups = buildFeedVideoGroups(
    [
      postItem({
        id: "p1",
        content: "설명은 캡션으로만",
        media: [{ id: "m1", url: "https://cdn.example/pic.jpg", type: "IMAGE" }],
      }),
    ],
    new Set(),
    new Set()
  );
  assert.equal(groups.length, 1);
  assert.equal(groups[0]?.videos.length, 1);
  assert.equal(groups[0]?.videos[0]?.mediaType, "IMAGE");
  assert.equal(groups[0]?.videos[0]?.content, "설명은 캡션으로만");
});

test("a text-only post still opens as a note", () => {
  const groups = buildFeedVideoGroups(
    [postItem({ id: "p2", content: "글만 있는 글" })],
    new Set(),
    new Set()
  );
  assert.equal(groups[0]?.videos.length, 1);
  assert.equal(groups[0]?.videos[0]?.mediaType, "NOTE");
  assert.equal(groups[0]?.videos[0]?.noteText, "글만 있는 글");
});
