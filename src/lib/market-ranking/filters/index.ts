import { starBool, starNum } from "@/lib/market-ranking/params";
import type { StarListingCandidate, StarMarketQuery } from "@/lib/market-ranking/types";
import type { Filter } from "@/lib/feed-ranking/pipeline/types";

export const starDedupFilter: Filter<StarMarketQuery, StarListingCandidate> = {
  id: "dedup",
  filter(_query, candidates) {
    const seen = new Set<string>();
    const kept: StarListingCandidate[] = [];
    const removed: StarListingCandidate[] = [];
    for (const c of candidates) {
      if (seen.has(c.listingId)) removed.push(c);
      else {
        seen.add(c.listingId);
        kept.push(c);
      }
    }
    return { kept, removed };
  },
};

export const starAgeFilter: Filter<StarMarketQuery, StarListingCandidate> = {
  id: "age",
  filter(query, candidates) {
    const maxDays = starNum(query.params, "MaxListingAgeDays");
    const cutoff = Date.now() - maxDays * 24 * 60 * 60 * 1000;
    const kept: StarListingCandidate[] = [];
    const removed: StarListingCandidate[] = [];
    for (const c of candidates) {
      const ts = (c.publishedAt ?? c.createdAt).getTime();
      if (ts < cutoff) removed.push(c);
      else kept.push(c);
    }
    return { kept, removed };
  },
};

export const starStockFilter: Filter<StarMarketQuery, StarListingCandidate> = {
  id: "out_of_stock",
  enable: (q) => starBool(q.params, "FilterOutOfStock"),
  filter(_query, candidates) {
    const kept: StarListingCandidate[] = [];
    const removed: StarListingCandidate[] = [];
    for (const c of candidates) {
      if (c.type === "PHYSICAL" && c.stock <= 0) removed.push(c);
      else kept.push(c);
    }
    return { kept, removed };
  },
};

export const starBlockFilter: Filter<StarMarketQuery, StarListingCandidate> = {
  id: "block",
  filter(query, candidates) {
    if (!query.blockedIds.size) return { kept: candidates, removed: [] };
    const kept: StarListingCandidate[] = [];
    const removed: StarListingCandidate[] = [];
    for (const c of candidates) {
      if (query.blockedIds.has(c.sellerId)) removed.push(c);
      else kept.push(c);
    }
    return { kept, removed };
  },
};

export const STAR_MARKET_FILTERS = [
  starDedupFilter,
  starAgeFilter,
  starStockFilter,
  starBlockFilter,
];
