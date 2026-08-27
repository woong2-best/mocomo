import { usedNum } from "@/lib/used-ranking/params";
import type { UsedListingCandidate, UsedMarketQuery, UsedScoreReason } from "@/lib/used-ranking/types";
import type { Scorer } from "@/lib/feed-ranking/pipeline/types";

function addSignal(
  c: UsedListingCandidate,
  signalId: string,
  raw: number,
  weight: number,
  label?: string
): UsedListingCandidate {
  if (raw <= 0) return c;
  const weighted = raw * weight;
  return {
    ...c,
    signalScores: { ...c.signalScores, [signalId]: weighted },
    reasons: [...c.reasons, { signalId, score: weighted, label } satisfies UsedScoreReason],
  };
}

export const usedEngagementScorer: Scorer<UsedMarketQuery, UsedListingCandidate> = {
  id: "engagement",
  async score(query, candidates) {
    const viewW = usedNum(query.params, "ViewWeight");
    const favW = usedNum(query.params, "FavoriteWeight");
    return candidates.map((c) => {
      let next = addSignal(c, "views", Math.log1p(c.viewCount) * 5, viewW);
      next = addSignal(next, "favorites", Math.log1p(c.favoriteCount) * 8, favW);
      return next;
    });
  },
};

export const usedRecencyScorer: Scorer<UsedMarketQuery, UsedListingCandidate> = {
  id: "recency",
  async score(query, candidates) {
    const weight = usedNum(query.params, "RecencyWeight");
    const now = Date.now();
    return candidates.map((c) => {
      const ageDays = (now - c.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      const raw = Math.max(0, 21 - ageDays);
      return addSignal(c, "recency", raw, weight);
    });
  },
};

export const usedAuctionScorer: Scorer<UsedMarketQuery, UsedListingCandidate> = {
  id: "auction_urgency",
  async score(query, candidates) {
    const weight = usedNum(query.params, "AuctionUrgencyWeight");
    const now = Date.now();
    return candidates.map((c) => {
      if (c.saleType !== "AUCTION" || !c.auctionEndsAt) return c;
      const hoursLeft = (c.auctionEndsAt.getTime() - now) / (1000 * 60 * 60);
      if (hoursLeft <= 0) return c;
      const urgency = Math.max(0, 48 - hoursLeft) / 4 + Math.log1p(c.bidCount);
      return addSignal(c, "auction_urgency", urgency, weight, "마감 임박");
    });
  },
};

export const usedGeoScorer: Scorer<UsedMarketQuery, UsedListingCandidate> = {
  id: "geo",
  async score(query, candidates) {
    const weight = usedNum(query.params, "GeoMatchWeight");
    if (!query.preferredRegion) return candidates;
    const prefix = query.preferredRegion.slice(0, 2);
    return candidates.map((c) => {
      if (!c.region.startsWith(prefix)) return c;
      return addSignal(c, "geo", 1, weight, "내 지역");
    });
  },
};

export const usedAffinityScorer: Scorer<UsedMarketQuery, UsedListingCandidate> = {
  id: "affinity",
  async score(query, candidates) {
    const catW = usedNum(query.params, "CategoryAffinityWeight");
    const workW = usedNum(query.params, "WorkAffinityWeight");
    return candidates.map((c) => {
      let next = c;
      if (query.favoriteCategories.has(c.category)) {
        next = addSignal(next, "category_affinity", 1, catW);
      }
      if (c.workTitle && query.favoriteWorks.has(c.workTitle)) {
        next = addSignal(next, "work_affinity", 1, workW, c.workTitle);
      }
      return next;
    });
  },
};

export const usedRankingScorer: Scorer<UsedMarketQuery, UsedListingCandidate> = {
  id: "ranking",
  async score(_query, candidates) {
    return candidates.map((c) => ({
      ...c,
      score: Object.values(c.signalScores).reduce((s, v) => s + v, 0),
    }));
  },
};

export const USED_MARKET_SCORERS = [
  usedEngagementScorer,
  usedRecencyScorer,
  usedAuctionScorer,
  usedGeoScorer,
  usedAffinityScorer,
  usedRankingScorer,
];
