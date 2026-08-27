import { getNumericParam } from "@/lib/feed-ranking/params";
import type { FeedQuery, PostCandidate, ScoreReason } from "@/lib/feed-ranking/types";
import type { Scorer } from "@/lib/feed-ranking/pipeline/types";

function addSignal(
  c: PostCandidate,
  signalId: string,
  raw: number,
  weight: number,
  label?: string
): PostCandidate {
  if (raw <= 0) return c;
  const weighted = raw * weight;
  const signalScores = { ...c.signalScores, [signalId]: weighted };
  const reasons: ScoreReason[] = [
    ...c.reasons,
    { signalId, score: weighted, label },
  ];
  return { ...c, signalScores, reasons };
}

/** 참여도 시그널 — X PhoenixScorer의 engagement action 대체 (휴리스틱) */
export const engagementScorer: Scorer<FeedQuery, PostCandidate> = {
  id: "engagement",
  async score(query, candidates) {
    const likeW = getNumericParam(query.params, "LikeWeight");
    const commentW = getNumericParam(query.params, "CommentWeight");
    const repostW = getNumericParam(query.params, "RepostWeight");
    const viewW = getNumericParam(query.params, "ViewWeight");
    const hotW = getNumericParam(query.params, "HotScoreWeight");

    return candidates.map((c) => {
      let next = c;
      next = addSignal(next, "likes", Math.log1p(c.likeCount) * 10, likeW);
      next = addSignal(next, "comments", Math.log1p(c.commentCount) * 10, commentW);
      next = addSignal(next, "reposts", Math.log1p(c.repostCount) * 10, repostW);
      next = addSignal(next, "views", Math.log1p(c.viewCount) * 5, viewW);
      next = addSignal(next, "hot_score", Math.max(0, c.hotScore), hotW);
      return next;
    });
  },
};

/** 신선도 — 최근 포스트 부스트 */
export const recencyScorer: Scorer<FeedQuery, PostCandidate> = {
  id: "recency",
  async score(query, candidates) {
    const weight = getNumericParam(query.params, "RecencyWeight");
    const now = Date.now();

    return candidates.map((c) => {
      const ageHours = (now - c.createdAt.getTime()) / (1000 * 60 * 60);
      const raw = Math.max(0, 48 - ageHours);
      return addSignal(c, "recency", raw, weight);
    });
  },
};

/** 인-네트워크 부스트 — X in_network flag */
export const inNetworkScorer: Scorer<FeedQuery, PostCandidate> = {
  id: "in_network",
  async score(query, candidates) {
    const boost = getNumericParam(query.params, "InNetworkBoost");
    return candidates.map((c) =>
      c.inNetwork ? addSignal(c, "in_network", 1, boost, "팔로우 중") : c
    );
  },
};

/** 작성자 친밀도 — 팔로우 관계 */
export const affinityScorer: Scorer<FeedQuery, PostCandidate> = {
  id: "affinity",
  async score(query, candidates) {
    const weight = getNumericParam(query.params, "AuthorAffinityWeight");
    return candidates.map((c) =>
      query.followingIds.has(c.authorId)
        ? addSignal(c, "author_affinity", 1, weight)
        : c
    );
  },
};

/** 관심사 매칭 — 태그·애니·커뮤니티 */
export const interestScorer: Scorer<FeedQuery, PostCandidate> = {
  id: "interest_match",
  async score(query, candidates) {
    const weight = getNumericParam(query.params, "InterestMatchWeight");

    return candidates.map((c) => {
      let matches = 0;
      if (c.communityId && query.communityIds.has(c.communityId)) matches += 1;
      if (c.animeId && query.animeIds.has(c.animeId)) matches += 1;
      if (matches === 0) return c;
      return addSignal(c, "interest_match", matches, weight);
    });
  },
};

/** X RankingScorer — Σ (weight × signal) + author diversity decay */
export const rankingScorer: Scorer<FeedQuery, PostCandidate> = {
  id: "ranking",
  async score(query, candidates) {
    const newAuthorBoost = getNumericParam(query.params, "NewAuthorBoost");

    return candidates.map((c) => {
      let total = Object.values(c.signalScores).reduce((s, v) => s + v, 0);
      if (c.bucket === "DISCOVERY" && query.isNewUser) {
        total += newAuthorBoost;
      }
      return { ...c, score: total };
    });
  },
};

export const FEED_SCORERS = [
  engagementScorer,
  recencyScorer,
  inNetworkScorer,
  affinityScorer,
  interestScorer,
  rankingScorer,
];
