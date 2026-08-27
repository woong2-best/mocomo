import type { UsedListingCategory } from "@prisma/client";
import type { PipelineCandidate, PipelineQuery } from "@/lib/feed-ranking/pipeline/types";
import type { UsedMarketParams } from "@/lib/used-ranking/params";

export type UsedMarketBucket = "RECENT" | "TRENDING" | "AUCTION" | "LOCAL" | "AFFINITY" | "MIXED";

export type UsedScoreReason = {
  signalId: string;
  score: number;
  label?: string;
};

export type UsedListingCandidate = PipelineCandidate & {
  listingId: string;
  sellerId: string;
  category: UsedListingCategory;
  price: number;
  region: string;
  saleType: "FIXED" | "AUCTION";
  auctionEndsAt: Date | null;
  bidCount: number;
  createdAt: Date;
  sourceId: string;
  bucket: UsedMarketBucket;
  viewCount: number;
  favoriteCount: number;
  workTitle: string | null;
  productType: string | null;
  isNsfw: boolean;
  signalScores: Record<string, number>;
  score: number;
  reasons: UsedScoreReason[];
};

export type UsedMarketQuery = PipelineQuery & {
  userId: string | null;
  countryCode: string;
  preferredRegion: string | null;
  preferredSido: string | null;
  params: UsedMarketParams;
  favoriteListingIds: Set<string>;
  favoriteCategories: Set<string>;
  favoriteWorks: Set<string>;
  blockedIds: Set<string>;
  filterCategory?: string;
  filterSaleType?: "FIXED" | "AUCTION";
  liveAuctionOnly?: boolean;
};

export const USED_MARKET_CACHE_TTL_MS = 4 * 60 * 60 * 1000;
export const USED_MARKET_LIST_LIMIT = 80;

export type RankedUsedListing = {
  listingId: string;
  score: number;
  rank: number;
  bucket: UsedMarketBucket;
  reasons: UsedScoreReason[];
};
