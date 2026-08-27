import { starBool, starNum } from "@/lib/market-ranking/params";
import type { StarListingCandidate, StarMarketBucket, StarMarketQuery } from "@/lib/market-ranking/types";
import type { Selector } from "@/lib/feed-ranking/pipeline/types";

const BUCKET_QUOTAS: { bucket: StarMarketBucket; ratio: number }[] = [
  { bucket: "RECENT", ratio: 0.25 },
  { bucket: "TRENDING", ratio: 0.3 },
  { bucket: "TRUSTED", ratio: 0.2 },
  { bucket: "AFFINITY", ratio: 0.25 },
];

export const starMarketSelector: Selector<StarMarketQuery, StarListingCandidate> = {
  id: "star_market_selector",
  select(query, candidates) {
    const limit = starNum(query.params, "FinalSelectLimit");
    const decay = starNum(query.params, "SellerDiversityDecay");
    const useDiversity = starBool(query.params, "EnableSellerDiversity");

    const sorted = [...candidates].sort((a, b) => b.score - a.score);

    if (!useDiversity) {
      return {
        selected: sorted.slice(0, limit),
        non_selected: sorted.slice(limit),
      };
    }

    const byBucket = new Map<StarMarketBucket, StarListingCandidate[]>();
    for (const c of sorted) {
      const arr = byBucket.get(c.bucket) ?? [];
      arr.push(c);
      byBucket.set(c.bucket, arr);
    }

    const picked: StarListingCandidate[] = [];
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
