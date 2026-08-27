import { executeCandidatePipeline } from "@/lib/feed-ranking/pipeline/executor";
import type { CandidatePipelineConfig } from "@/lib/feed-ranking/pipeline/types";
import { buildFeedParams } from "@/lib/feed-ranking/params";
import { viewerContextHydrator } from "@/lib/feed-ranking/query-hydrators/viewer-context";
import { FEED_SOURCES } from "@/lib/feed-ranking/sources";
import { postMetadataHydrator } from "@/lib/feed-ranking/hydrators/post-metadata";
import { PRE_SCORING_FILTERS } from "@/lib/feed-ranking/filters";
import { FEED_SCORERS } from "@/lib/feed-ranking/scorers";
import { feedSelector } from "@/lib/feed-ranking/selectors";
import type { FeedQuery, PostCandidate } from "@/lib/feed-ranking/types";

/** X PhoenixCandidatePipeline — 홈 For You 포스트 파이프라인 */
export const homeFeedPipeline: CandidatePipelineConfig<FeedQuery, PostCandidate> = {
  id: "home_for_you",
  queryHydrators: [viewerContextHydrator],
  sources: FEED_SOURCES,
  hydrators: [postMetadataHydrator],
  preScoringFilters: PRE_SCORING_FILTERS,
  scorers: FEED_SCORERS,
  selector: feedSelector,
  postSelectionFilters: [],
  sideEffects: [],
};

export async function runHomeFeedPipeline(userId: string) {
  const initialQuery: FeedQuery = {
    userId,
    locale: "ko",
    countryCode: "KR",
    params: buildFeedParams(),
    followingIds: new Set(),
    blockedIds: new Set(),
    mutedIds: new Set(),
    seenPostIds: new Set(),
    favoriteTags: [],
    communityIds: new Set(),
    animeIds: new Set(),
    isNewUser: false,
  };

  return executeCandidatePipeline(homeFeedPipeline, initialQuery);
}
