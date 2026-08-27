import { executeCandidatePipeline } from "@/lib/feed-ranking/pipeline/executor";
import type { CandidatePipelineConfig } from "@/lib/feed-ranking/pipeline/types";
import { buildUsedMarketParams } from "@/lib/used-ranking/params";
import { usedMarketViewerHydrator } from "@/lib/used-ranking/query-hydrators/viewer-context";
import { USED_MARKET_SOURCES } from "@/lib/used-ranking/sources";
import { USED_MARKET_FILTERS } from "@/lib/used-ranking/filters";
import { USED_MARKET_SCORERS } from "@/lib/used-ranking/scorers";
import { usedMarketSelector } from "@/lib/used-ranking/selectors";
import type { UsedListingCandidate, UsedMarketQuery } from "@/lib/used-ranking/types";

export const usedMarketPipeline: CandidatePipelineConfig<
  UsedMarketQuery,
  UsedListingCandidate
> = {
  id: "used_market_discover",
  queryHydrators: [usedMarketViewerHydrator],
  sources: USED_MARKET_SOURCES,
  hydrators: [],
  preScoringFilters: USED_MARKET_FILTERS,
  scorers: USED_MARKET_SCORERS,
  selector: usedMarketSelector,
};

export async function runUsedMarketPipeline(opts: {
  userId: string | null;
  filterCategory?: string;
  filterSaleType?: "FIXED" | "AUCTION";
  liveAuctionOnly?: boolean;
  preferredRegion?: string | null;
}) {
  const initialQuery: UsedMarketQuery = {
    userId: opts.userId,
    countryCode: "KR",
    preferredRegion: opts.preferredRegion ?? null,
    preferredSido: null,
    params: buildUsedMarketParams(),
    favoriteListingIds: new Set(),
    favoriteCategories: new Set(),
    favoriteWorks: new Set(),
    blockedIds: new Set(),
    filterCategory: opts.filterCategory,
    filterSaleType: opts.filterSaleType,
    liveAuctionOnly: opts.liveAuctionOnly,
  };

  return executeCandidatePipeline(usedMarketPipeline, initialQuery);
}
