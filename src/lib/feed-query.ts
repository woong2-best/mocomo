import { unstable_cache } from "next/cache";
import { FEED_POSTS_CACHE_TAG } from "@/lib/cache-tags";
import { db } from "@/lib/db";
import { userPublicSelect } from "@/lib/user-public-select";
import { postMediaPreview } from "@/lib/post-media-select";
import { postPollSelect, mapPostPollRow } from "@/lib/post-poll";
import { postCollaboratorsHeaderInclude } from "@/lib/post-collaborator-select";
import { platformPostWhere } from "@/lib/post-scope";

const FEED_POST_MAX_CONTENT = 520;

export const feedPostListSelect = {
  id: true,
  title: true,
  content: true,
  postType: true,
  createdAt: true,
  isNsfw: true,
  isPinned: true,
  viewCount: true,
  instantPurchasePriceKrw: true,
  visibility: true,
  author: { select: userPublicSelect },
  collaborators: postCollaboratorsHeaderInclude,
  anime: { select: { title: true, slug: true } },
  media: postMediaPreview,
  poll: { select: postPollSelect },
  _count: { select: { likes: true, comments: true, votes: true, reposts: true, media: true } },
} as const;

export type FeedPostRow = {
  id: string;
  title: string | null;
  content: string;
  postType: string;
  createdAt: Date;
  isNsfw: boolean;
  isPinned: boolean;
  viewCount: number;
  author: { id: string; username: string; image: string | null; supportTierSent: string };
  anime: { title: string; slug: string } | null;
  media: { id?: string; url: string; type: string; priceKrw?: number | null }[];
  _count: { likes: number; comments: number; votes: number; reposts: number; media?: number };
};

export function trimFeedPostContent<T extends { content: string }>(post: T): T {
  if (post.content.length <= FEED_POST_MAX_CONTENT) return post;
  return { ...post, content: `${post.content.slice(0, FEED_POST_MAX_CONTENT)}…` };
}

function mapFeedPost<T extends { poll: Parameters<typeof mapPostPollRow>[0] | null; content: string }>(
  post: T
) {
  return trimFeedPostContent({
    ...post,
    poll: post.poll ? mapPostPollRow(post.poll) : null,
  });
}

export { mapFeedPost };

export const feedPostListSelectNoReposts = {
  ...feedPostListSelect,
  _count: { select: { likes: true, comments: true, votes: true, media: true } },
} as const;

export const feedPostListSelectNoPoll = {
  id: true,
  title: true,
  content: true,
  postType: true,
  createdAt: true,
  isNsfw: true,
  isPinned: true,
  viewCount: true,
  instantPurchasePriceKrw: true,
  visibility: true,
  author: { select: userPublicSelect },
  collaborators: postCollaboratorsHeaderInclude,
  anime: { select: { title: true, slug: true } },
  media: postMediaPreview,
  _count: { select: { likes: true, comments: true, votes: true, reposts: true, media: true } },
} as const;

export async function fetchFeedPostsPage(cursor: string | null, limit: number) {
  const query = {
    where: platformPostWhere,
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: "desc" as const },
  };

  try {
    const posts = await db.post.findMany({ ...query, select: feedPostListSelect });
    return posts.map(mapFeedPost);
  } catch (e) {
    console.error("[feed] poll/reposts", e);
    try {
      const posts = await db.post.findMany({ ...query, select: feedPostListSelectNoReposts });
      return posts.map((p) =>
        mapFeedPost({
          ...p,
          poll: null,
          _count: { ...p._count, reposts: 0 },
        })
      );
    } catch (e2) {
      console.error("[feed] fallback", e2);
      const posts = await db.post.findMany({ ...query, select: feedPostListSelectNoPoll });
      return posts.map((p) => trimFeedPostContent({ ...p, poll: null }));
    }
  }
}

/**
 * Mobile Home list — Twitter/IG-class first paint.
 * Skip collaborators + poll; cap media URLs (card shows 1; lightbox uses post detail if needed).
 */
const mobileFeedMediaPreview = {
  take: 8,
  orderBy: { order: "asc" as const },
  select: {
    id: true,
    url: true,
    type: true,
    priceKrw: true,
    width: true,
    height: true,
    duration: true,
    hlsUrl: true,
    posterUrl: true,
  },
} as const;

export const mobileFeedPostSelect = {
  id: true,
  title: true,
  content: true,
  postType: true,
  createdAt: true,
  isNsfw: true,
  viewCount: true,
  visibility: true,
  instantPurchasePriceKrw: true,
  author: {
    select: {
      ...userPublicSelect,
      creatorSubscriptionPriceKrw: true,
    },
  },
  anime: { select: { title: true, slug: true } },
  media: mobileFeedMediaPreview,
  _count: { select: { likes: true, comments: true, votes: true, reposts: true } },
} as const;

const mobileFeedPostSelectNoReposts = {
  ...mobileFeedPostSelect,
  _count: { select: { likes: true, comments: true, votes: true } },
} as const;

export async function fetchMobileFeedPostsPage(cursor: string | null, limit: number) {
  const query = {
    where: platformPostWhere,
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: "desc" as const },
  };

  try {
    const posts = await db.post.findMany({ ...query, select: mobileFeedPostSelect });
    return posts.map((p) => trimFeedPostContent(p));
  } catch (e) {
    console.error("[mobile-feed] reposts", e);
    const posts = await db.post.findMany({ ...query, select: mobileFeedPostSelectNoReposts });
    return posts.map((p) =>
      trimFeedPostContent({
        ...p,
        _count: { ...p._count, reposts: 0 },
      })
    );
  }
}

/** 무한 스크롤 페이지 — 짧은 TTL 캐시로 DB 부하 완화 */
export function getCachedFeedPostsPage(cursor: string | null, limit: number) {
  const cacheKey = cursor ?? "__head__";
  return unstable_cache(
    () => fetchFeedPostsPage(cursor, limit),
    ["feed-page-v9-platform-only", cacheKey, String(limit)],
    { revalidate: 30, tags: [FEED_POSTS_CACHE_TAG] }
  )();
}

export function getCachedMobileFeedPostsPage(cursor: string | null, limit: number) {
  const cacheKey = cursor ?? "__head__";
  return unstable_cache(
    () => fetchMobileFeedPostsPage(cursor, limit),
    ["mobile-feed-page-v3-platform-only", cacheKey, String(limit)],
    { revalidate: 20, tags: [FEED_POSTS_CACHE_TAG] }
  )();
}

/** ID 순서를 유지하며 피드 포스트 fetch (For You 랭킹용) */
export async function fetchWebFeedPostsByIds(postIds: string[]): Promise<FeedPostRow[]> {
  if (!postIds.length) return [];
  const posts = await db.post.findMany({
    where: { id: { in: postIds }, ...platformPostWhere },
    select: feedPostListSelect,
  });
  const byId = new Map(posts.map((p) => [p.id, p]));
  return postIds
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => p != null)
    .map(mapFeedPost);
}

export async function fetchMobileFeedPostsByIds(
  postIds: string[]
): Promise<Awaited<ReturnType<typeof fetchMobileFeedPostsPage>>> {
  if (!postIds.length) return [];
  const posts = await db.post.findMany({
    where: { id: { in: postIds }, ...platformPostWhere },
    select: mobileFeedPostSelect,
  });
  const byId = new Map(posts.map((p) => [p.id, p]));
  return postIds
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => p != null)
    .map((p) => trimFeedPostContent(p));
}

/** @deprecated fetchWebFeedPostsByIds / fetchMobileFeedPostsByIds 사용 */
export async function fetchFeedPostsByIds(postIds: string[], variant: "web" | "mobile" = "web") {
  return variant === "mobile"
    ? fetchMobileFeedPostsByIds(postIds)
    : fetchWebFeedPostsByIds(postIds);
}
