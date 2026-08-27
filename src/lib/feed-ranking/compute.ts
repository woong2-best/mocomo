import { db } from "@/lib/db";
import { runHomeFeedPipeline } from "@/lib/feed-ranking/pipelines/home-feed";
import {
  FEED_CACHE_TTL_MS,
  FEED_LIST_LIMIT,
  type RankedFeedItem,
} from "@/lib/feed-ranking/types";

/** 사용자별 For You 피드 랭킹 계산 → FeedRecommendation 캐시 저장 */
export async function computeFeedRanking(userId: string, limit = FEED_LIST_LIMIT) {
  const { selected, stats } = await runHomeFeedPipeline(userId);
  if (!selected.length) {
    await db.feedRecommendation.deleteMany({ where: { userId } });
    return { items: [] as RankedFeedItem[], stats };
  }

  const expiresAt = new Date(Date.now() + FEED_CACHE_TTL_MS);
  const now = new Date();
  const trimmed = selected.slice(0, limit);

  await db.$transaction([
    db.feedRecommendation.deleteMany({ where: { userId } }),
    db.feedRecommendation.createMany({
      data: trimmed.map((c, rank) => ({
        userId,
        postId: c.postId,
        score: c.score,
        bucket: c.bucket,
        inNetwork: c.inNetwork,
        reasons: { signals: c.reasons, sourceId: c.sourceId },
        rank: rank + 1,
        computedAt: now,
        expiresAt,
      })),
    }),
  ]);

  const items: RankedFeedItem[] = trimmed.map((c, rank) => ({
    postId: c.postId,
    score: c.score,
    rank: rank + 1,
    bucket: c.bucket,
    reasons: c.reasons,
    inNetwork: c.inNetwork,
  }));

  return { items, stats };
}

export async function getOrComputeFeedRanking(userId: string, limit = FEED_LIST_LIMIT) {
  const cached = await db.feedRecommendation.findMany({
    where: {
      userId,
      expiresAt: { gt: new Date() },
    },
    orderBy: { rank: "asc" },
    take: limit,
    select: {
      postId: true,
      score: true,
      rank: true,
      bucket: true,
      inNetwork: true,
      reasons: true,
    },
  });

  if (cached.length >= Math.min(10, limit)) {
    return cached.map((r) => ({
      postId: r.postId,
      score: r.score,
      rank: r.rank,
      bucket: r.bucket,
      inNetwork: r.inNetwork,
      reasons: parseReasons(r.reasons),
    }));
  }

  const { items } = await computeFeedRanking(userId, limit);
  return items;
}

function parseReasons(reasons: unknown): RankedFeedItem["reasons"] {
  if (reasons && typeof reasons === "object" && !Array.isArray(reasons)) {
    const payload = reasons as { signals?: RankedFeedItem["reasons"] };
    if (Array.isArray(payload.signals)) return payload.signals;
  }
  if (Array.isArray(reasons)) return reasons as RankedFeedItem["reasons"];
  return [];
}

/** 활성 사용자 피드 캐시 배치 갱신 */
export async function refreshFeedRankingCaches(opts?: {
  limit?: number;
  forceAllActive?: boolean;
}) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const users = await db.user.findMany({
    where: {
      deletedAt: null,
      isBanned: false,
      OR: [{ lastLoginAt: { gte: since } }, { createdAt: { gte: since } }],
    },
    select: { id: true },
    take: opts?.limit ?? 200,
    orderBy: { lastLoginAt: "desc" },
  });

  let refreshed = 0;
  for (const u of users) {
    if (!opts?.forceAllActive) {
      const fresh = await db.feedRecommendation.count({
        where: { userId: u.id, expiresAt: { gt: new Date() } },
      });
      if (fresh >= 10) continue;
    }
    try {
      await computeFeedRanking(u.id);
      refreshed += 1;
    } catch (e) {
      console.error(`[feed-ranking] refresh ${u.id}`, e);
    }
  }
  return { candidates: users.length, refreshed };
}
