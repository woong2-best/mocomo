import type { FeedParams } from "@/lib/feed-ranking/params";
import type { PipelineCandidate, PipelineQuery } from "@/lib/feed-ranking/pipeline/types";

/** X PostCandidate — 홈 피드 후보 */
export type FeedBucket =
  | "IN_NETWORK"
  | "TRENDING"
  | "DISCOVERY"
  | "INTEREST"
  | "MIXED";

export type ScoreReason = {
  signalId: string;
  score: number;
  label?: string;
};

export type PostCandidate = PipelineCandidate & {
  postId: string;
  authorId: string;
  createdAt: Date;
  sourceId: string;
  bucket: FeedBucket;
  inNetwork: boolean;
  isNsfw: boolean;
  hotScore: number;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  viewCount: number;
  /** 개별 시그널 점수 */
  signalScores: Record<string, number>;
  /** 최종 랭킹 점수 */
  score: number;
  reasons: ScoreReason[];
  /** 태그·애니·커뮤니티 (interest 매칭용) */
  animeId: string | null;
  communityId: string | null;
  tagIds: string[];
};

/** X ScoredPostsQuery — 뷰어 요청 컨텍스트 */
export type FeedQuery = PipelineQuery & {
  userId: string;
  locale: string;
  countryCode: string;
  params: FeedParams;
  followingIds: Set<string>;
  blockedIds: Set<string>;
  mutedIds: Set<string>;
  seenPostIds: Set<string>;
  favoriteTags: string[];
  communityIds: Set<string>;
  animeIds: Set<string>;
  isNewUser: boolean;
};

export const FEED_CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4h
export const FEED_LIST_LIMIT = 120;
export const FEED_POOL_LIMIT = 200;
export const NEW_USER_DAYS = 14;

export type RankedFeedItem = {
  postId: string;
  score: number;
  rank: number;
  bucket: FeedBucket;
  reasons: ScoreReason[];
  inNetwork: boolean;
};
