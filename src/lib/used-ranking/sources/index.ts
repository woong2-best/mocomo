import type { UsedListingCategory } from "@prisma/client";
import { db } from "@/lib/db";
import { usedBool, usedNum } from "@/lib/used-ranking/params";
import type { UsedListingCandidate, UsedMarketBucket, UsedMarketQuery } from "@/lib/used-ranking/types";
import type { Source } from "@/lib/feed-ranking/pipeline/types";

const listingSelect = {
  id: true,
  sellerId: true,
  category: true,
  price: true,
  region: true,
  saleType: true,
  auctionEndsAt: true,
  bidCount: true,
  createdAt: true,
  viewCount: true,
  workTitle: true,
  productType: true,
  isNsfw: true,
  _count: { select: { favorites: true } },
} as const;

type ListingRow = {
  id: string;
  sellerId: string;
  category: UsedListingCategory;
  price: number;
  region: string;
  saleType: "FIXED" | "AUCTION";
  auctionEndsAt: Date | null;
  bidCount: number;
  createdAt: Date;
  viewCount: number;
  workTitle: string | null;
  productType: string | null;
  isNsfw: boolean;
  _count: { favorites: number };
};

function baseWhere(query: UsedMarketQuery) {
  const where: Record<string, unknown> = { status: "SELLING" };
  if (query.filterCategory) where.category = query.filterCategory;
  if (query.filterSaleType) where.saleType = query.filterSaleType;
  if (query.liveAuctionOnly) {
    where.saleType = "AUCTION";
    where.auctionEndsAt = { gt: new Date() };
  }
  return where;
}

function toCandidate(
  row: ListingRow,
  sourceId: string,
  bucket: UsedMarketBucket
): UsedListingCandidate {
  return {
    id: row.id,
    listingId: row.id,
    sellerId: row.sellerId,
    category: row.category,
    price: row.price,
    region: row.region,
    saleType: row.saleType,
    auctionEndsAt: row.auctionEndsAt,
    bidCount: row.bidCount,
    createdAt: row.createdAt,
    sourceId,
    bucket,
    viewCount: row.viewCount,
    favoriteCount: row._count.favorites,
    workTitle: row.workTitle,
    productType: row.productType,
    isNsfw: row.isNsfw,
    signalScores: {},
    score: 0,
    reasons: [],
  };
}

export const recentUsedSource: Source<UsedMarketQuery, UsedListingCandidate> = {
  id: "recent",
  enable: (q) => usedBool(q.params, "EnableRecentSource"),
  async source(query) {
    const rows = await db.usedListing.findMany({
      where: baseWhere(query),
      select: listingSelect,
      orderBy: { createdAt: "desc" },
      take: usedNum(query.params, "RecentSourceLimit"),
    });
    return rows.map((r) => toCandidate(r, "recent", "RECENT"));
  },
};

export const trendingUsedSource: Source<UsedMarketQuery, UsedListingCandidate> = {
  id: "trending",
  enable: (q) => usedBool(q.params, "EnableTrendingSource"),
  async source(query) {
    const rows = await db.usedListing.findMany({
      where: baseWhere(query),
      select: listingSelect,
      orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
      take: usedNum(query.params, "TrendingSourceLimit"),
    });
    return rows.map((r) => toCandidate(r, "trending", "TRENDING"));
  },
};

export const auctionUsedSource: Source<UsedMarketQuery, UsedListingCandidate> = {
  id: "auction",
  enable: (q) => usedBool(q.params, "EnableAuctionSource"),
  async source(query) {
    const rows = await db.usedListing.findMany({
      where: {
        ...baseWhere(query),
        saleType: "AUCTION",
        auctionEndsAt: { gt: new Date() },
      },
      select: listingSelect,
      orderBy: [{ auctionEndsAt: "asc" }, { bidCount: "desc" }],
      take: usedNum(query.params, "AuctionSourceLimit"),
    });
    return rows.map((r) => toCandidate(r, "auction", "AUCTION"));
  },
};

export const localUsedSource: Source<UsedMarketQuery, UsedListingCandidate> = {
  id: "local",
  enable: (q) => usedBool(q.params, "EnableLocalSource") && !!q.preferredRegion,
  async source(query) {
    if (!query.preferredRegion) return [];
    const prefix = query.preferredRegion.slice(0, 2);
    const rows = await db.usedListing.findMany({
      where: {
        ...baseWhere(query),
        region: { startsWith: prefix },
      },
      select: listingSelect,
      orderBy: { createdAt: "desc" },
      take: usedNum(query.params, "LocalSourceLimit"),
    });
    return rows.map((r) => toCandidate(r, "local", "LOCAL"));
  },
};

export const USED_MARKET_SOURCES = [
  recentUsedSource,
  trendingUsedSource,
  auctionUsedSource,
  localUsedSource,
];
