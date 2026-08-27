import { db } from "@/lib/db";
import { runStarMarketPipeline } from "@/lib/market-ranking/pipelines/star-market";
import {
  STAR_MARKET_CACHE_TTL_MS,
  STAR_MARKET_LIST_LIMIT,
  type RankedStarListing,
} from "@/lib/market-ranking/types";
import type { MarketplaceListingType } from "@prisma/client";
import type { CommerceRecommendationKind } from "@prisma/client";

const KIND: CommerceRecommendationKind = "STAR_MARKET";

function parseReasons(reasons: unknown): RankedStarListing["reasons"] {
  if (reasons && typeof reasons === "object" && !Array.isArray(reasons)) {
    const payload = reasons as { signals?: RankedStarListing["reasons"] };
    if (Array.isArray(payload.signals)) return payload.signals;
  }
  return [];
}

export async function computeStarMarketRanking(
  userId: string,
  opts?: { filterType?: MarketplaceListingType | "ALL"; filterCategory?: string },
  limit = STAR_MARKET_LIST_LIMIT
) {
  const { selected, stats } = await runStarMarketPipeline({
    userId,
    filterType: opts?.filterType,
    filterCategory: opts?.filterCategory,
  });

  if (!selected.length) {
    await db.commerceRecommendation.deleteMany({ where: { userId, kind: KIND } });
    return { items: [] as RankedStarListing[], stats };
  }

  const expiresAt = new Date(Date.now() + STAR_MARKET_CACHE_TTL_MS);
  const now = new Date();
  const trimmed = selected.slice(0, limit);

  await db.$transaction([
    db.commerceRecommendation.deleteMany({ where: { userId, kind: KIND } }),
    db.commerceRecommendation.createMany({
      data: trimmed.map((c, rank) => ({
        userId,
        kind: KIND,
        listingId: c.listingId,
        score: c.score,
        bucket: c.bucket,
        reasons: { signals: c.reasons, sourceId: c.sourceId },
        rank: rank + 1,
        computedAt: now,
        expiresAt,
      })),
    }),
  ]);

  return {
    items: trimmed.map((c, rank) => ({
      listingId: c.listingId,
      score: c.score,
      rank: rank + 1,
      bucket: c.bucket,
      reasons: c.reasons,
    })),
    stats,
  };
}

export async function getOrComputeStarMarketRanking(
  userId: string,
  opts?: { filterType?: MarketplaceListingType | "ALL"; filterCategory?: string },
  limit = STAR_MARKET_LIST_LIMIT
): Promise<RankedStarListing[]> {
  const cached = await db.commerceRecommendation.findMany({
    where: { userId, kind: KIND, expiresAt: { gt: new Date() } },
    orderBy: { rank: "asc" },
    take: limit,
    select: {
      listingId: true,
      score: true,
      rank: true,
      bucket: true,
      reasons: true,
    },
  });

  if (cached.length >= Math.min(8, limit)) {
    return cached.map((r) => ({
      listingId: r.listingId,
      score: r.score,
      rank: r.rank,
      bucket: r.bucket as RankedStarListing["bucket"],
      reasons: parseReasons(r.reasons),
    }));
  }

  const { items } = await computeStarMarketRanking(userId, opts, limit);
  return items;
}

/** 게스트·필터 없음 — 캐시 없이 즉시 실행 */
export async function runStarMarketRankingLive(opts?: {
  userId?: string | null;
  filterType?: MarketplaceListingType | "ALL";
  filterCategory?: string;
  limit?: number;
}) {
  const { selected } = await runStarMarketPipeline({
    userId: opts?.userId ?? null,
    filterType: opts?.filterType,
    filterCategory: opts?.filterCategory,
  });
  return selected.slice(0, opts?.limit ?? STAR_MARKET_LIST_LIMIT).map((c) => c.listingId);
}

export async function refreshStarMarketRankingCaches(opts?: { limit?: number }) {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const users = await db.user.findMany({
    where: {
      deletedAt: null,
      isBanned: false,
      OR: [{ lastLoginAt: { gte: since } }, { createdAt: { gte: since } }],
    },
    select: { id: true },
    take: opts?.limit ?? 100,
    orderBy: { lastLoginAt: "desc" },
  });

  let refreshed = 0;
  for (const u of users) {
    try {
      await computeStarMarketRanking(u.id);
      refreshed += 1;
    } catch (e) {
      console.error(`[market-ranking] refresh ${u.id}`, e);
    }
  }
  return { candidates: users.length, refreshed };
}
