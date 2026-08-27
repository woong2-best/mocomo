import type { MarketplaceListingType } from "@prisma/client";
import { db } from "@/lib/db";
import { starBool, starNum } from "@/lib/market-ranking/params";
import type { StarListingCandidate, StarMarketBucket, StarMarketQuery } from "@/lib/market-ranking/types";
import type { Source } from "@/lib/feed-ranking/pipeline/types";

const listingSelect = {
  id: true,
  sellerId: true,
  type: true,
  category: true,
  priceAmount: true,
  publishedAt: true,
  createdAt: true,
  viewCount: true,
  favoriteCount: true,
  salesCount: true,
  stock: true,
  isNsfw: true,
  tags: true,
  sellerProfile: { select: { trustScore: true, ratingAvg: true } },
} as const;

type ListingRow = {
  id: string;
  sellerId: string;
  type: MarketplaceListingType;
  category: string;
  priceAmount: number;
  publishedAt: Date | null;
  createdAt: Date;
  viewCount: number;
  favoriteCount: number;
  salesCount: number;
  stock: number;
  isNsfw: boolean;
  tags: string[];
  sellerProfile: { trustScore: number; ratingAvg: number } | null;
};

function baseWhere(query: StarMarketQuery) {
  const where: Record<string, unknown> = {
    status: "ACTIVE",
    type: { not: "DIGITAL" },
  };
  if (query.filterType && query.filterType !== "ALL") {
    where.type = query.filterType;
  }
  if (query.filterCategory) where.category = query.filterCategory;
  return where;
}

function toCandidate(
  row: ListingRow,
  sourceId: string,
  bucket: StarMarketBucket
): StarListingCandidate {
  return {
    id: row.id,
    listingId: row.id,
    sellerId: row.sellerId,
    type: row.type,
    category: row.category,
    priceAmount: row.priceAmount,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    sourceId,
    bucket,
    viewCount: row.viewCount,
    favoriteCount: row.favoriteCount,
    salesCount: row.salesCount,
    stock: row.stock,
    isNsfw: row.isNsfw,
    tags: row.tags,
    trustScore: row.sellerProfile?.trustScore ?? 40,
    ratingAvg: row.sellerProfile?.ratingAvg ?? 0,
    signalScores: {},
    score: 0,
    reasons: [],
  };
}

export const recentStarSource: Source<StarMarketQuery, StarListingCandidate> = {
  id: "recent",
  enable: (q) => starBool(q.params, "EnableRecentSource"),
  async source(query) {
    const rows = await db.marketplaceListing.findMany({
      where: baseWhere(query),
      select: listingSelect,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: starNum(query.params, "RecentSourceLimit"),
    });
    return rows.map((r) => toCandidate(r, "recent", "RECENT"));
  },
};

export const trendingStarSource: Source<StarMarketQuery, StarListingCandidate> = {
  id: "trending",
  enable: (q) => starBool(q.params, "EnableTrendingSource"),
  async source(query) {
    const rows = await db.marketplaceListing.findMany({
      where: baseWhere(query),
      select: listingSelect,
      orderBy: [{ salesCount: "desc" }, { favoriteCount: "desc" }, { publishedAt: "desc" }],
      take: starNum(query.params, "TrendingSourceLimit"),
    });
    return rows.map((r) => toCandidate(r, "trending", "TRENDING"));
  },
};

export const trustedStarSource: Source<StarMarketQuery, StarListingCandidate> = {
  id: "trusted",
  enable: (q) => starBool(q.params, "EnableTrustedSource"),
  async source(query) {
    const rows = await db.marketplaceListing.findMany({
      where: {
        ...baseWhere(query),
        sellerProfile: { trustScore: { gte: 70 } },
      },
      select: listingSelect,
      orderBy: [{ sellerProfile: { trustScore: "desc" } }, { salesCount: "desc" }],
      take: starNum(query.params, "TrustedSourceLimit"),
    });
    return rows.map((r) => toCandidate(r, "trusted", "TRUSTED"));
  },
};

export const affinityStarSource: Source<StarMarketQuery, StarListingCandidate> = {
  id: "affinity",
  enable: (q) => starBool(q.params, "EnableAffinitySource"),
  async source(query) {
    const sellerIds = [
      ...query.purchasedSellerIds,
      ...query.favoriteSellerIds,
    ].slice(0, 30);
    const categories = query.preferredCategories.slice(0, 5);

    const orClauses: Record<string, unknown>[] = [];
    if (sellerIds.length) orClauses.push({ sellerId: { in: sellerIds } });
    if (categories.length) orClauses.push({ category: { in: categories } });
    if (!orClauses.length) return [];

    const rows = await db.marketplaceListing.findMany({
      where: { ...baseWhere(query), OR: orClauses },
      select: listingSelect,
      orderBy: { publishedAt: "desc" },
      take: starNum(query.params, "AffinitySourceLimit"),
    });
    return rows.map((r) => toCandidate(r, "affinity", "AFFINITY"));
  },
};

export const STAR_MARKET_SOURCES = [
  recentStarSource,
  trendingStarSource,
  trustedStarSource,
  affinityStarSource,
];
