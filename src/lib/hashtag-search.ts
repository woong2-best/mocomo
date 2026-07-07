import { unstable_cache } from "next/cache";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { isHashtagSearchQuery } from "@/lib/linkify";
import {
  feedPostListSelect,
  feedPostListSelectNoPoll,
  feedPostListSelectNoReposts,
  mapFeedPost,
  trimFeedPostContent,
} from "@/lib/feed-query";

export type HashtagSort = "top" | "latest";

export function parseHashtagFromQuery(q: string): string | null {
  const trimmed = q.trim();
  if (!isHashtagSearchQuery(trimmed)) return null;
  const tag = trimmed.slice(1).trim();
  return tag.length > 0 ? tag : null;
}

export function hashtagDisplayLabel(tag: string): string {
  return tag.startsWith("#") ? tag : `#${tag}`;
}

function hashtagContentFilter(tag: string): Prisma.PostWhereInput {
  const needle = `#${tag}`;
  return {
    OR: [
      { content: { contains: needle, mode: "insensitive" } },
      { title: { contains: needle, mode: "insensitive" } },
    ],
  };
}

export async function countHashtagPosts(tag: string): Promise<number> {
  try {
    return await db.post.count({ where: hashtagContentFilter(tag) });
  } catch {
    return 0;
  }
}

export async function fetchHashtagPosts(tag: string, sort: HashtagSort, limit = 40) {
  const where = hashtagContentFilter(tag);
  const orderBy: Prisma.PostOrderByWithRelationInput[] =
    sort === "top"
      ? [{ likes: { _count: "desc" } }, { createdAt: "desc" }]
      : [{ createdAt: "desc" }];

  try {
    const posts = await db.post.findMany({
      where,
      take: limit,
      orderBy,
      select: feedPostListSelect,
    });
    return posts.map(mapFeedPost);
  } catch (e) {
    console.error("[hashtag-search] primary", e);
    try {
      const posts = await db.post.findMany({
        where,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: feedPostListSelectNoReposts,
      });
      return posts.map((p) =>
        mapFeedPost({
          ...p,
          poll: null,
          _count: { ...p._count, reposts: 0 },
        })
      );
    } catch (e2) {
      console.error("[hashtag-search] fallback", e2);
      const posts = await db.post.findMany({
        where,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: feedPostListSelectNoPoll,
      });
      return posts.map((p) => trimFeedPostContent({ ...p, poll: null }));
    }
  }
}

export type HashtagFeedPost = Awaited<ReturnType<typeof fetchHashtagPosts>>[number];

export function getCachedHashtagPosts(tag: string, sort: HashtagSort) {
  const key = tag.toLowerCase().slice(0, 80);
  return unstable_cache(
    () => fetchHashtagPosts(tag, sort),
    ["hashtag-posts-v1", key, sort],
    { revalidate: 30 }
  )();
}

export function getCachedHashtagPostCount(tag: string) {
  const key = tag.toLowerCase().slice(0, 80);
  return unstable_cache(() => countHashtagPosts(tag), ["hashtag-count-v1", key], {
    revalidate: 60,
  })();
}
