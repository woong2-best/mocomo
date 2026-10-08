import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import type { FeedAdData } from "@/lib/default-ads";
import { listEligibleSponsorCreatives } from "@/lib/sponsored-ad/eligible-creatives";

/** Boosted photo posts + event creatives + AdSlot 인피드 풀 */
export async function fetchFeedAdPool(): Promise<FeedAdData[]> {
  const [slots, creatives] = await Promise.all([
    db.adSlot.findMany({
      where: { active: true, isFeedAd: true },
      take: 10,
      select: {
        id: true,
        title: true,
        imageUrl: true,
        linkUrl: true,
        sponsorName: true,
        ctaLabel: true,
        adCategory: true,
      },
    }),
    listEligibleSponsorCreatives(),
  ]);

  const creativeAds: FeedAdData[] = creatives.map((c) => ({
    id: c.id,
    title: c.title,
    imageUrl: c.imageUrl,
    linkUrl: c.linkUrl,
    sponsorName: c.authorName ?? "MoCoMo",
    ctaLabel: c.ctaLabel ?? (c.kind === "post" ? "View post" : "Go to"),
    adCategory: c.kind === "post" ? "Boost" : "Ad",
    excerpt: c.excerpt ?? null,
    kind: c.kind,
    postId: c.postId ?? null,
  }));

  const slotAds: FeedAdData[] = slots.map((s) => ({
    id: s.id,
    title: s.title,
    imageUrl: s.imageUrl,
    linkUrl: s.linkUrl,
    sponsorName: s.sponsorName,
    ctaLabel: s.ctaLabel,
    adCategory: s.adCategory ?? "Ad",
  }));

  return [...creativeAds, ...slotAds];
}

export const getCachedFeedAdPool = unstable_cache(
  async () => fetchFeedAdPool(),
  ["feed-ad-pool-v3"],
  { revalidate: 60 }
);
