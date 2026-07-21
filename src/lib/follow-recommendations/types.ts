import type { RecommendationBucket } from "@prisma/client";

/** 확장 가능한 시그널 ID — 새 시그널 추가 시 여기에만 등록 */
export type RecommendationSignalId =
  | "common_follow"
  | "interest"
  | "community"
  | "tag"
  | "activity"
  | "profile_visit"
  | "interaction"
  | "locale"
  | "geo"
  | "new_user_boost"
  | "popularity"
  | "growth"
  | "search"
  | "video_watch"
  | "live_watch"
  | "post_view";

export type SignalReason = {
  signalId: RecommendationSignalId;
  score: number;
  label?: string;
};

export type ScoredCandidate = {
  candidateId: string;
  score: number;
  bucket: RecommendationBucket;
  reasons: SignalReason[];
  /** UI용 — 공통 관심사 태그 또는 공통 팔로우 수 */
  sharedLabel?: string;
  sharedFollowCount?: number;
  sharedTags?: string[];
};

export type ViewerContext = {
  userId: string;
  locale: string;
  countryCode: string;
  createdAt: Date;
  favoriteTags: string[];
  followingIds: Set<string>;
  followerIds: Set<string>;
  communityIds: Set<string>;
  animeIds: Set<string>;
  isNewUser: boolean;
};

export type SignalBatchResult = Map<
  string,
  { score: number; label?: string; meta?: Record<string, unknown> }
>;

/**
 * 시그널 프로바이더 — 새 추천 축을 추가하려면 이 인터페이스만 구현하고
 * `signals/index.ts`의 SIGNAL_PROVIDERS에 등록하면 됩니다.
 */
export type SignalProvider = {
  id: RecommendationSignalId;
  /** 최종 점수에 곱해지는 가중치 */
  weight: number;
  /** 후보 풀에 넣을 사용자 ID (선택) */
  suggestCandidates?: (ctx: ViewerContext, limit: number) => Promise<string[]>;
  /** 후보들에 대한 배치 점수 (0~100 권장) */
  scoreBatch: (ctx: ViewerContext, candidateIds: string[]) => Promise<SignalBatchResult>;
};

export type RecommendListItem = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  supportTierSent: string;
  score: number;
  bucket: RecommendationBucket;
  sharedLabel: string | null;
  sharedFollowCount: number;
  sharedTags: string[];
  viewerFollows: boolean;
};

export const REC_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h
export const REC_LIST_LIMIT = 8;
export const REC_POOL_LIMIT = 120;
export const NEW_USER_DAYS = 14;
