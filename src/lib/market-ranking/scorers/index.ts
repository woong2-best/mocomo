import { starNum } from "@/lib/market-ranking/params";
import type { StarListingCandidate, StarMarketQuery, StarScoreReason } from "@/lib/market-ranking/types";
import type { Scorer } from "@/lib/feed-ranking/pipeline/types";

function addSignal(
  c: StarListingCandidate,
  signalId: string,
  raw: number,
  weight: number,
  label?: string
): StarListingCandidate {
  if (raw <= 0) return c;
  const weighted = raw * weight;
  return {
    ...c,
    signalScores: { ...c.signalScores, [signalId]: weighted },
    reasons: [...c.reasons, { signalId, score: weighted, label } satisfies StarScoreReason],
  };
}

export const starEngagementScorer: Scorer<StarMarketQuery, StarListingCandidate> = {
  id: "engagement",
  async score(query, candidates) {
    const viewW = starNum(query.params, "ViewWeight");
    const favW = starNum(query.params, "FavoriteWeight");
    const salesW = starNum(query.params, "SalesWeight");

    return candidates.map((c) => {
      let next = c;
      next = addSignal(next, "views", Math.log1p(c.viewCount) * 5, viewW);
      next = addSignal(next, "favorites", Math.log1p(c.favoriteCount) * 8, favW);
      next = addSignal(next, "sales", Math.log1p(c.salesCount) * 10, salesW);
      return next;
    });
  },
};

export const starRecencyScorer: Scorer<StarMarketQuery, StarListingCandidate> = {
  id: "recency",
  async score(query, candidates) {
    const weight = starNum(query.params, "RecencyWeight");
    const now = Date.now();
    return candidates.map((c) => {
      const ts = (c.publishedAt ?? c.createdAt).getTime();
      const ageDays = (now - ts) / (1000 * 60 * 60 * 24);
      const raw = Math.max(0, 14 - ageDays);
      return addSignal(c, "recency", raw, weight);
    });
  },
};

export const starTrustScorer: Scorer<StarMarketQuery, StarListingCandidate> = {
  id: "trust",
  async score(query, candidates) {
    const trustW = starNum(query.params, "TrustWeight");
    const ratingW = starNum(query.params, "RatingWeight");
    return candidates.map((c) => {
      let next = addSignal(c, "trust", c.trustScore / 20, trustW);
      if (c.ratingAvg > 0) {
        next = addSignal(next, "rating", c.ratingAvg, ratingW);
      }
      return next;
    });
  },
};

export const starAffinityScorer: Scorer<StarMarketQuery, StarListingCandidate> = {
  id: "affinity",
  async score(query, candidates) {
    const weight = starNum(query.params, "AffinityWeight");
    return candidates.map((c) => {
      let boost = 0;
      if (query.purchasedSellerIds.has(c.sellerId)) boost += 1.2;
      if (query.favoriteSellerIds.has(c.sellerId)) boost += 0.8;
      if (query.preferredCategories.includes(c.category)) boost += 0.6;
      if (boost <= 0) return c;
      return addSignal(c, "affinity", boost, weight, "관심 셀러/카테고리");
    });
  },
};

export const starRankingScorer: Scorer<StarMarketQuery, StarListingCandidate> = {
  id: "ranking",
  async score(_query, candidates) {
    return candidates.map((c) => ({
      ...c,
      score: Object.values(c.signalScores).reduce((s, v) => s + v, 0),
    }));
  },
};

export const STAR_MARKET_SCORERS = [
  starEngagementScorer,
  starRecencyScorer,
  starTrustScorer,
  starAffinityScorer,
  starRankingScorer,
];
