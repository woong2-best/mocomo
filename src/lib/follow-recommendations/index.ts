export type {
  RecommendationSignalId,
  SignalProvider,
  RecommendListItem,
  ScoredCandidate,
  ViewerContext,
} from "@/lib/follow-recommendations/types";
export { SIGNAL_PROVIDERS } from "@/lib/follow-recommendations/signals";
export {
  computeFollowRecommendations,
  getOrComputeFollowRecommendations,
} from "@/lib/follow-recommendations/compute";
export {
  listFollowRecommendationsForUser,
  recordRecommendationEvent,
  onFollowFromRecommendation,
} from "@/lib/follow-recommendations/service";
export {
  recordProfileVisit,
  recordPostViewEvent,
  recordVideoWatch,
  recordLiveWatch,
} from "@/lib/follow-recommendations/record-signals";
export {
  snapshotUserGrowth,
  refreshFollowRecommendationCaches,
} from "@/lib/follow-recommendations/growth";
