import { db } from "@/lib/db";
import { getBoolParam, getNumericParam } from "@/lib/feed-ranking/params";
import { platformPostWhere } from "@/lib/post-scope";
import type { FeedBucket, FeedQuery, PostCandidate } from "@/lib/feed-ranking/types";
import type { Source } from "@/lib/feed-ranking/pipeline/types";

function toCandidate(
  row: {
    id: string;
    authorId: string;
    createdAt: Date;
    isNsfw: boolean;
    hotScore: number;
    viewCount: number;
    animeId: string | null;
    communityId: string | null;
    _count: { likes: number; comments: number; reposts: number };
  },
  sourceId: string,
  bucket: FeedBucket,
  inNetwork: boolean
): PostCandidate {
  return {
    id: row.id,
    postId: row.id,
    authorId: row.authorId,
    createdAt: row.createdAt,
    sourceId,
    bucket,
    inNetwork,
    isNsfw: row.isNsfw,
    hotScore: row.hotScore,
    likeCount: row._count.likes,
    commentCount: row._count.comments,
    repostCount: row._count.reposts,
    viewCount: row.viewCount,
    animeId: row.animeId,
    communityId: row.communityId,
    tagIds: [],
    signalScores: {},
    score: 0,
    reasons: [],
  };
}

const postSelect = {
  id: true,
  authorId: true,
  createdAt: true,
  isNsfw: true,
  hotScore: true,
  viewCount: true,
  animeId: true,
  communityId: true,
  _count: { select: { likes: true, comments: true, reposts: true } },
} as const;

/** X Thunder — 팔로우 계정의 인-네트워크 포스트 */
export const followingSource: Source<FeedQuery, PostCandidate> = {
  id: "following",
  enable: (q) => getBoolParam(q.params, "EnableFollowingSource"),
  async source(query) {
    const limit = getNumericParam(query.params, "FollowingSourceLimit");
    const following = [...query.followingIds].slice(0, 200);
    if (!following.length) return [];

    const rows = await db.post.findMany({
      where: {
        ...platformPostWhere,
        authorId: { in: following },
        visibility: "PUBLIC",
      },
      select: postSelect,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return rows.map((r) => toCandidate(r, "following", "IN_NETWORK", true));
  },
};

/** 글로벌 트렌딩 — hotScore 기반 */
export const trendingSource: Source<FeedQuery, PostCandidate> = {
  id: "trending",
  enable: (q) => getBoolParam(q.params, "EnableTrendingSource"),
  async source(query) {
    const limit = getNumericParam(query.params, "TrendingSourceLimit");

    const rows = await db.post.findMany({
      where: { ...platformPostWhere, visibility: "PUBLIC" },
      select: postSelect,
      orderBy: [{ hotScore: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    return rows.map((r) =>
      toCandidate(
        r,
        "trending",
        "TRENDING",
        query.followingIds.has(r.authorId)
      )
    );
  },
};

/** 관심사 매칭 — 태그·애니·커뮤니티 */
export const interestSource: Source<FeedQuery, PostCandidate> = {
  id: "interest",
  enable: (q) => getBoolParam(q.params, "EnableInterestSource"),
  async source(query) {
    const limit = getNumericParam(query.params, "InterestSourceLimit");
    const orClauses: Record<string, unknown>[] = [];

    if (query.animeIds.size) {
      orClauses.push({ animeId: { in: [...query.animeIds].slice(0, 30) } });
    }
    if (query.favoriteTags.length) {
      orClauses.push({
        tags: {
          some: { tag: { name: { in: query.favoriteTags.slice(0, 12) } } },
        },
      });
    }
    if (!orClauses.length) return [];

    const rows = await db.post.findMany({
      where: {
        ...platformPostWhere,
        visibility: "PUBLIC",
        OR: orClauses,
        authorId: { not: query.userId },
      },
      select: postSelect,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return rows.map((r) =>
      toCandidate(
        r,
        "interest",
        "INTEREST",
        query.followingIds.has(r.authorId)
      )
    );
  },
};

/** X Phoenix/SimClusters — 아웃-오브-네트워크 디스커버리 */
export const discoverySource: Source<FeedQuery, PostCandidate> = {
  id: "discovery",
  enable: (q) => getBoolParam(q.params, "EnableDiscoverySource"),
  async source(query) {
    const limit = getNumericParam(query.params, "DiscoverySourceLimit");
    const excludeAuthors = new Set([
      query.userId,
      ...query.followingIds,
      ...query.blockedIds,
      ...query.mutedIds,
    ]);

    const rows = await db.post.findMany({
      where: {
        ...platformPostWhere,
        visibility: "PUBLIC",
        authorId: { notIn: [...excludeAuthors].slice(0, 500) },
      },
      select: postSelect,
      orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    return rows.map((r) => toCandidate(r, "discovery", "DISCOVERY", false));
  },
};

/**
 * FallbackCandidateSource — 1차 소스 합이 FallbackMinCandidates 미만일 때
 * 전체 공개 포스트에서 최신순 + 랜덤 오프셋으로 보충 (피드 고갈 방지).
 */
export const fallbackCandidateSource: Source<FeedQuery, PostCandidate> = {
  id: "fallback",
  enable: (q) => getBoolParam(q.params, "EnableFallbackSource"),
  async source(query) {
    const limit = getNumericParam(query.params, "FallbackSourceLimit");
    const excludeAuthors = [...query.blockedIds, ...query.mutedIds].slice(0, 200);

    const total = await db.post.count({
      where: {
        ...platformPostWhere,
        visibility: "PUBLIC",
        ...(excludeAuthors.length ? { authorId: { notIn: excludeAuthors } } : {}),
      },
    });
    if (total === 0) return [];

    const skip = total > limit ? Math.floor(Math.random() * Math.max(1, total - limit)) : 0;

    const [latest, randomSlice] = await Promise.all([
      db.post.findMany({
        where: {
          ...platformPostWhere,
          visibility: "PUBLIC",
          ...(excludeAuthors.length ? { authorId: { notIn: excludeAuthors } } : {}),
        },
        select: postSelect,
        orderBy: { createdAt: "desc" },
        take: Math.ceil(limit / 2),
      }),
      db.post.findMany({
        where: {
          ...platformPostWhere,
          visibility: "PUBLIC",
          ...(excludeAuthors.length ? { authorId: { notIn: excludeAuthors } } : {}),
        },
        select: postSelect,
        orderBy: { createdAt: "desc" },
        skip,
        take: Math.ceil(limit / 2),
      }),
    ]);

    const seen = new Set<string>();
    const out: PostCandidate[] = [];
    for (const r of [...latest, ...randomSlice]) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      out.push(
        toCandidate(
          r,
          "fallback",
          "MIXED",
          query.followingIds.has(r.authorId)
        )
      );
    }
    return out;
  },
};

export const FEED_SOURCES = [followingSource, trendingSource, interestSource, discoverySource];
export const FEED_FALLBACK_SOURCES = [fallbackCandidateSource];
