/**
 * X home-mixer/params/param.rs 패턴 — 런타임 가중치·한도 기본값.
 * 프로덕션 feature switch와 동기화 시 이 파일을 갱신합니다.
 */

export const FEED_PARAMS = {
  // Sources
  EnableFollowingSource: true,
  EnableTrendingSource: true,
  EnableInterestSource: true,
  EnableDiscoverySource: true,
  /** 후보 부족 시 전체 DB에서 최신/랜덤 보충 (X cold-start fallback) */
  EnableFallbackSource: true,

  // Pool limits
  SourcePoolLimit: 80,
  FollowingSourceLimit: 60,
  TrendingSourceLimit: 40,
  InterestSourceLimit: 40,
  DiscoverySourceLimit: 50,
  FallbackSourceLimit: 120,
  /** 소스 합산 후보가 이 수 미만이면 FallbackCandidateSource 가동 */
  FallbackMinCandidates: 24,
  FinalSelectLimit: 120,

  // Filters
  MaxPostAgeHours: 168, // 7 days
  /** 후보 부족 시 age로 제거된 항목을 다시 살림 */
  SoftAgeFilter: true,
  FilterSeenPosts: true,
  /**
   * Soft seen: 24h 이내만 hard-exclude, 이후 재노출 허용.
   * 그래도 후보가 부족하면 최근 본 콘텐츠도 순환(loop) 허용.
   */
  SeenSoftFilter: true,
  SeenReexposeAfterHours: 24,
  FilterBlockedAuthors: true,
  FilterSelfPosts: false,

  // Scoring — Heavy Ranking은 점수로 정렬만 하고 Drop 하지 않음
  DropBelowScoreThreshold: false,
  MinScoreThreshold: 0,

  // Scoring weights (X RankingScorer 패턴: Σ weight × signal)
  LikeWeight: 0.8,
  CommentWeight: 1.2,
  RepostWeight: 1.5,
  ViewWeight: 0.15,
  HotScoreWeight: 1.0,
  RecencyWeight: 2.0,
  InNetworkBoost: 3.0,
  AuthorAffinityWeight: 2.5,
  InterestMatchWeight: 1.8,
  NewAuthorBoost: 0.5,

  // Diversity (VMRanker lite)
  AuthorDiversityDecay: 0.72,
  EnableAuthorDiversity: true,

  // Cache
  CacheTtlHours: 4,
} as const;

export type FeedParamKey = keyof typeof FEED_PARAMS;
export type FeedParams = Record<FeedParamKey, number | boolean>;

export function buildFeedParams(overrides?: Partial<FeedParams>): FeedParams {
  return { ...FEED_PARAMS, ...overrides };
}

export function getParam(params: FeedParams, key: FeedParamKey): number | boolean {
  return params[key] ?? FEED_PARAMS[key];
}

export function getNumericParam(params: FeedParams, key: FeedParamKey): number {
  const v = getParam(params, key);
  return typeof v === "number" ? v : 0;
}

export function getBoolParam(params: FeedParams, key: FeedParamKey): boolean {
  const v = getParam(params, key);
  return typeof v === "boolean" ? v : false;
}
