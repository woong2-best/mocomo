import { executeCandidatePipeline } from "@/lib/feed-ranking/pipeline/executor";
import type { CandidatePipelineConfig } from "@/lib/feed-ranking/pipeline/types";
import { buildStarMarketParams } from "@/lib/market-ranking/params";
import { starMarketViewerHydrator } from "@/lib/market-ranking/query-hydrators/viewer-context";
import { STAR_MARKET_SOURCES } from "@/lib/market-ranking/sources";
import { STAR_MARKET_FILTERS } from "@/lib/market-ranking/filters";
import { STAR_MARKET_SCORERS } from "@/lib/market-ranking/scorers";
import { starMarketSelector } from "@/lib/market-ranking/selectors";
import type { StarListingCandidate, StarMarketQuery } from "@/lib/market-ranking/types";
import type { MarketplaceListingType } from "@prisma/client";

export const starMarketPipeline: CandidatePipelineConfig<
  StarMarketQuery,
  StarListingCandidate
> = {
  id: "star_market_discover",
  queryHydrators: [starMarketViewerHydrator],
  sources: STAR_MARKET_SOURCES,
  hydrators: [],
  preScoringFilters: STAR_MARKET_FILTERS,
  scorers: STAR_MARKET_SCORERS,
  selector: starMarketSelector,
};

export async function runStarMarketPipeline(opts: {
  userId: string | null;
  filterType?: MarketplaceListingType | "ALL";
  filterCategory?: string;
}) {
  const initialQuery: StarMarketQuery = {
    userId: opts.userId,
    countryCode: "KR",
    params: buildStarMarketParams(),
    favoriteListingIds: new Set(),
    purchasedSellerIds: new Set(),
    favoriteSellerIds: new Set(),
    blockedIds: new Set(),
    preferredCategories: [],
    filterType: opts.filterType,
    filterCategory: opts.filterCategory,
  };

  return executeCandidatePipeline(starMarketPipeline, initialQuery);
}
