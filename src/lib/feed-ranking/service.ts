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

/**
 * API Wrapper — 랭킹/쿼리 결과가 page size 미만이면 전체 DB에서
 * 최신순으로 보충하고, 그래도 모자라면 앞에서부터 순환(loop)해 채움.
 * 피드가 절대 빈 페이지로 끊기지 않도록 보장.
 */
export async function padPostIdsToPageSize(
  ids: string[],
  limit: number,
  opts?: { excludeIds?: Set<string>; canViewNsfw?: boolean }
): Promise<string[]> {
  if (limit <= 0) return [];
  if (ids.length >= limit) return ids.slice(0, limit);

  const canViewNsfw = opts?.canViewNsfw ?? false;
  const exclude = new Set(opts?.excludeIds ?? []);
  for (const id of ids) exclude.add(id);

  const out = [...ids];
  const batchSize = Math.min(Math.max(limit * 3, 24), 120);

  // Pass 1: unseen (not in exclude) latest posts
  let scanCursor: string | null = null;
  for (let guard = 0; guard < 8 && out.length < limit; guard++) {
    const rows = await db.post.findMany({
      where: {
        ...platformPostWhere,
        ...nsfwPostWhere(canViewNsfw),
        visibility: "PUBLIC",
        ...(exclude.size ? { id: { notIn: [...exclude].slice(0, 500) } } : {}),
      },
      select: { id: true },
      orderBy: { createdAt: "desc" },
      take: batchSize,
      ...(scanCursor ? { skip: 1, cursor: { id: scanCursor } } : {}),
    });
    if (!rows.length) break;
    for (const row of rows) {
      scanCursor = row.id;
      if (exclude.has(row.id)) continue;
      exclude.add(row.id);
      out.push(row.id);
      if (out.length >= limit) break;
    }
    if (rows.length < batchSize) break;
  }

  // Pass 2: loop — allow duplicates of already-ranked/seen pool so scroll never ends
  if (out.length < limit) {
    const pool = await db.post.findMany({
      where: {
        ...platformPostWhere,
        ...nsfwPostWhere(canViewNsfw),
        visibility: "PUBLIC",
      },
      select: { id: true },
      orderBy: { createdAt: "desc" },
      take: Math.max(limit * 2, 40),
    });
    if (pool.length) {
      let i = 0;
      while (out.length < limit) {
        out.push(pool[i % pool.length]!.id);
        i += 1;
        if (i > pool.length * limit) break;
      }
    }
  }

  return out.slice(0, limit);
}

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
      else {
        // 랭킹 캐시 밖 커서(패드/순환분) → 소진으로 간주하고 DB 패딩만 사용
        startRank = ranked.length;
      }
    }
  }

  // 캐시 소진 시 빈 배열 → padPostIdsToPageSize가 DB 순환으로 채움
  return ranked.slice(startRank, startRank + limit).map((r) => r.postId);
}

export async function fetchRankedWebFeedPage(
  userId: string,
  cursor: string | null,
  limit: number,
  canViewNsfw = false
): Promise<FeedPostRow[]> {
  try {
    const rankedIds = await rankedPostIds(userId, cursor, limit);
    const baseIds = rankedIds ?? [];
    const ids = await padPostIdsToPageSize(baseIds, limit, { canViewNsfw });
    if (!ids.length) return fetchFeedPostsPage(cursor, limit, canViewNsfw);
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
    const rankedIds = await rankedPostIds(userId, cursor, limit);
    const baseIds = rankedIds ?? [];
    const ids = await padPostIdsToPageSize(baseIds, limit, { canViewNsfw });
    if (!ids.length) return fetchMobileFeedPostsPage(cursor, limit, canViewNsfw);
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
  if (!authorIds.length) {
    // 팔로우 없으면 최신 피드로 순환 패딩
    const ids = await padPostIdsToPageSize([], limit, { canViewNsfw });
    return ids.length ? fetchWebFeedPostsByIds(ids, canViewNsfw) : [];
  }

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
  const mapped = posts.map(mapFeedPost);
  if (mapped.length >= limit) return mapped;

  const paddedIds = await padPostIdsToPageSize(
    mapped.map((p) => p.id),
    limit,
    { canViewNsfw }
  );
  if (paddedIds.length <= mapped.length) return mapped;
  return fetchWebFeedPostsByIds(paddedIds, canViewNsfw);
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
  if (!authorIds.length) {
    const ids = await padPostIdsToPageSize([], limit, { canViewNsfw });
    return ids.length ? fetchMobileFeedPostsByIds(ids, canViewNsfw) : [];
  }

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
  const mapped = posts.map((p) => trimFeedPostContent(p));
  if (mapped.length >= limit) return mapped;

  const paddedIds = await padPostIdsToPageSize(
    mapped.map((p) => p.id),
    limit,
    { canViewNsfw }
  );
  if (paddedIds.length <= mapped.length) return mapped;
  return fetchMobileFeedPostsByIds(paddedIds, canViewNsfw);
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
