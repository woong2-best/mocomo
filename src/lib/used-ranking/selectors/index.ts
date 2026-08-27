import { usedBool, usedNum } from "@/lib/used-ranking/params";
import type { UsedListingCandidate, UsedMarketBucket, UsedMarketQuery } from "@/lib/used-ranking/types";
import type { Selector } from "@/lib/feed-ranking/pipeline/types";

const BUCKET_QUOTAS: { bucket: UsedMarketBucket; ratio: number }[] = [
  { bucket: "RECENT", ratio: 0.25 },
  { bucket: "TRENDING", ratio: 0.25 },
  { bucket: "AUCTION", ratio: 0.2 },
  { bucket: "LOCAL", ratio: 0.15 },
  { bucket: "AFFINITY", ratio: 0.15 },
];

export const usedMarketSelector: Selector<UsedMarketQuery, UsedListingCandidate> = {
  id: "used_market_selector",
  select(query, candidates) {
    const limit = usedNum(query.params, "FinalSelectLimit");
    const decay = usedNum(query.params, "SellerDiversityDecay");
    const useDiversity = usedBool(query.params, "EnableSellerDiversity");

    const sorted = [...candidates].sort((a, b) => b.score - a.score);

    if (!useDiversity) {
      return {
        selected: sorted.slice(0, limit),
        non_selected: sorted.slice(limit),
      };
    }

    const byBucket = new Map<UsedMarketBucket, UsedListingCandidate[]>();
    for (const c of sorted) {
      const arr = byBucket.get(c.bucket) ?? [];
      arr.push(c);
      byBucket.set(c.bucket, arr);
    }

    const picked: UsedListingCandidate[] = [];
    const used = new Set<string>();
    const sellerCounts = new Map<string, number>();

    for (const { bucket, ratio } of BUCKET_QUOTAS) {
      const need = Math.max(1, Math.floor(limit * ratio));
      const pool = byBucket.get(bucket) ?? [];
      let count = 0;
      for (const c of pool) {
        if (picked.length >= limit || count >= need) break;
        if (used.has(c.listingId)) continue;
        const sc = sellerCounts.get(c.sellerId) ?? 0;
        const penalty = sc > 0 ? Math.pow(decay, sc) : 1;
        picked.push({ ...c, score: c.score * penalty });
        used.add(c.listingId);
        sellerCounts.set(c.sellerId, sc + 1);
        count += 1;
      }
    }

    for (const c of sorted) {
      if (picked.length >= limit) break;
      if (used.has(c.listingId)) continue;
      picked.push(c);
      used.add(c.listingId);
    }

    const selectedIds = new Set(picked.map((p) => p.listingId));
    return {
      selected: picked,
      non_selected: sorted.filter((c) => !selectedIds.has(c.listingId)),
    };
  },
};
