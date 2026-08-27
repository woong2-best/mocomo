import type { MarketplaceListingType } from "@prisma/client";
import type { PipelineCandidate, PipelineQuery } from "@/lib/feed-ranking/pipeline/types";
import type { StarMarketParams } from "@/lib/market-ranking/params";

export type StarMarketBucket = "RECENT" | "TRENDING" | "TRUSTED" | "AFFINITY" | "MIXED";

export type StarScoreReason = {
  signalId: string;
  score: number;
  label?: string;
};

export type StarListingCandidate = PipelineCandidate & {
  listingId: string;
  sellerId: string;
  type: MarketplaceListingType;
  category: string;
  priceAmount: number;
  publishedAt: Date | null;
  createdAt: Date;
  sourceId: string;
  bucket: StarMarketBucket;
  viewCount: number;
  favoriteCount: number;
  salesCount: number;
  stock: number;
  isNsfw: boolean;
  tags: string[];
  trustScore: number;
  ratingAvg: number;
  signalScores: Record<string, number>;
  score: number;
  reasons: StarScoreReason[];
};

export type StarMarketQuery = PipelineQuery & {
  userId: string | null;
  countryCode: string;
  params: StarMarketParams;
  favoriteListingIds: Set<string>;
  purchasedSellerIds: Set<string>;
  favoriteSellerIds: Set<string>;
  blockedIds: Set<string>;
  preferredCategories: string[];
  filterType?: MarketplaceListingType | "ALL";
  filterCategory?: string;
};

export const STAR_MARKET_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
export const STAR_MARKET_LIST_LIMIT = 80;

export type RankedStarListing = {
  listingId: string;
  score: number;
  rank: number;
  bucket: StarMarketBucket;
  reasons: StarScoreReason[];
};
