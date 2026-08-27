import { usedBool, usedNum } from "@/lib/used-ranking/params";
import type { UsedListingCandidate, UsedMarketQuery } from "@/lib/used-ranking/types";
import type { Filter } from "@/lib/feed-ranking/pipeline/types";

export const usedDedupFilter: Filter<UsedMarketQuery, UsedListingCandidate> = {
  id: "dedup",
  filter(_query, candidates) {
    const seen = new Set<string>();
    const kept: UsedListingCandidate[] = [];
    const removed: UsedListingCandidate[] = [];
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

export const usedAgeFilter: Filter<UsedMarketQuery, UsedListingCandidate> = {
  id: "age",
  filter(query, candidates) {
    const maxDays = usedNum(query.params, "MaxListingAgeDays");
    const cutoff = Date.now() - maxDays * 24 * 60 * 60 * 1000;
    const kept: UsedListingCandidate[] = [];
    const removed: UsedListingCandidate[] = [];
    for (const c of candidates) {
      if (c.createdAt.getTime() < cutoff) removed.push(c);
      else kept.push(c);
    }
    return { kept, removed };
  },
};

export const usedBlockFilter: Filter<UsedMarketQuery, UsedListingCandidate> = {
  id: "block",
  filter(query, candidates) {
    if (!query.blockedIds.size) return { kept: candidates, removed: [] };
    const kept: UsedListingCandidate[] = [];
    const removed: UsedListingCandidate[] = [];
    for (const c of candidates) {
      if (query.blockedIds.has(c.sellerId)) removed.push(c);
      else kept.push(c);
    }
    return { kept, removed };
  },
};

export const USED_MARKET_FILTERS = [usedDedupFilter, usedAgeFilter, usedBlockFilter];
