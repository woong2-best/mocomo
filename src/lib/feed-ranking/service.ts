import { db } from "@/lib/db";
import {
  fetchFeedPostsPage,
  fetchWebFeedPostsByIds,
  fetchMobileFeedPostsByIds,
  fetchMobileFeedPostsPage,
  feedPostListSelect,
  mobileFeedPostSelect,
  mapFeedPost,
  trimFeedPostContent,
  type FeedPostRow,
} from "@/lib/feed-query";
import { platformPostWhere } from "@/lib/post-scope";
import { nsfwPostWhere } from "@/lib/nsfw-viewer-access";
import { getOrComputeFeedRanking } from "@/lib/feed-ranking/compute";

export type FeedMode = "for_you" | "latest" | "following";

type MobileFeedPost = Awaited<ReturnType<typeof fetchMobileFeedPostsPage>>[number];

async function rankedPostIds(userId: string, cursor: string | null, limit: number) {
  const ranked = await getOrComputeFeedRanking(userId, 120);
  if (!ranked.length) return null;

  let startRank = 0;
  if (cursor) {
    const byPost = ranked.findIndex((r) => r.postId === cursor);
    if (byPost >= 0) startRank = byPost + 1;
    else {
      const offset = parseInt(cursor, 10);
      if (!Number.isNaN(offset)) startRank = offset;
    }
  }

  return ranked.slice(startRank, startRank + limit).map((r) => r.postId);
}

export async function fetchRankedWebFeedPage(
  userId: string,
  cursor: string | null,
  limit: number,
  canViewNsfw = false
): Promise<FeedPostRow[]> {
  try {
    const ids = await rankedPostIds(userId, cursor, limit);
    if (ids === null) return fetchFeedPostsPage(cursor, limit, canViewNsfw);
    if (!ids.length) return [];
    return fetchWebFeedPostsByIds(ids, canViewNsfw);
  } catch (e) {
    console.error("[feed-ranking] web ranked feed failed, falling back to latest", e);
    return fetchFeedPostsPage(cursor, limit, canViewNsfw);
  }
}

export async function fetchRankedMobileFeedPage(
  userId: string,
  cursor: string | null,
  limit: number,
  canViewNsfw = false
): Promise<MobileFeedPost[]> {
  try {
    const ids = await rankedPostIds(userId, cursor, limit);
    if (ids === null) return fetchMobileFeedPostsPage(cursor, limit, canViewNsfw);
    if (!ids.length) return [];
    return fetchMobileFeedPostsByIds(ids, canViewNsfw);
  } catch (e) {
    console.error("[feed-ranking] mobile ranked feed failed, falling back to latest", e);
    return fetchMobileFeedPostsPage(cursor, limit, canViewNsfw);
  }
}

export async function fetchFollowingWebFeedPage(
  userId: string,
  cursor: string | null,
  limit: number,
  canViewNsfw = false
): Promise<FeedPostRow[]> {
  const following = await db.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
    take: 500,
  });
  const authorIds = following.map((f) => f.followingId);
  if (!authorIds.length) return [];

  const posts = await db.post.findMany({
    where: {
      ...platformPostWhere,
      ...nsfwPostWhere(canViewNsfw),
      authorId: { in: authorIds },
      visibility: "PUBLIC",
    },
    select: feedPostListSelect,
    orderBy: { createdAt: "desc" },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });
  return posts.map(mapFeedPost);
}

export async function fetchFollowingMobileFeedPage(
  userId: string,
  cursor: string | null,
  limit: number,
  canViewNsfw = false
): Promise<MobileFeedPost[]> {
  const following = await db.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
    take: 500,
  });
  const authorIds = following.map((f) => f.followingId);
  if (!authorIds.length) return [];

  const posts = await db.post.findMany({
    where: {
      ...platformPostWhere,
      ...nsfwPostWhere(canViewNsfw),
      authorId: { in: authorIds },
      visibility: "PUBLIC",
    },
    select: mobileFeedPostSelect,
    orderBy: { createdAt: "desc" },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });
  return posts.map((p) => trimFeedPostContent(p));
}

export async function resolveFeedPage(opts: {
  userId: string | null;
  mode: FeedMode;
  cursor: string | null;
  limit: number;
  variant: "mobile";
  canViewNsfw?: boolean;
}): Promise<MobileFeedPost[]>;
export async function resolveFeedPage(opts: {
  userId: string | null;
  mode: FeedMode;
  cursor: string | null;
  limit: number;
  variant?: "web";
  canViewNsfw?: boolean;
}): Promise<FeedPostRow[]>;
export async function resolveFeedPage(opts: {
  userId: string | null;
  mode: FeedMode;
  cursor: string | null;
  limit: number;
  variant?: "web" | "mobile";
  canViewNsfw?: boolean;
}): Promise<FeedPostRow[] | MobileFeedPost[]> {
  const variant = opts.variant ?? "web";
  const canViewNsfw = opts.canViewNsfw ?? false;

  if (!opts.userId) {
    return variant === "mobile"
      ? fetchMobileFeedPostsPage(opts.cursor, opts.limit, canViewNsfw)
      : fetchFeedPostsPage(opts.cursor, opts.limit, canViewNsfw);
  }

  if (variant === "mobile") {
    switch (opts.mode) {
      case "for_you":
        return fetchRankedMobileFeedPage(opts.userId, opts.cursor, opts.limit, canViewNsfw);
      case "following":
        return fetchFollowingMobileFeedPage(opts.userId, opts.cursor, opts.limit, canViewNsfw);
      case "latest":
      default:
        return fetchMobileFeedPostsPage(opts.cursor, opts.limit, canViewNsfw);
    }
  }

  switch (opts.mode) {
    case "for_you":
      return fetchRankedWebFeedPage(opts.userId, opts.cursor, opts.limit, canViewNsfw);
    case "following":
      return fetchFollowingWebFeedPage(opts.userId, opts.cursor, opts.limit, canViewNsfw);
    case "latest":
    default:
      return fetchFeedPostsPage(opts.cursor, opts.limit, canViewNsfw);
  }
}

export type { RankedFeedItem } from "@/lib/feed-ranking/types";
