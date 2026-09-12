import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import type { FeedAdData } from "@/lib/default-ads";
import { listEligibleSponsorEvents } from "@/lib/sponsored-ad/eligible-events";

/** AdSlot 피드 광고 + 결제 완료 이벤트를 트위터/X 스타일 인피드 광고 풀로 합침 */
export async function fetchFeedAdPool(): Promise<FeedAdData[]> {
  const [slots, events] = await Promise.all([
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
    listEligibleSponsorEvents(),
  ]);

  const eventAds: FeedAdData[] = events
    .filter((e): e is typeof e & { imageUrl: string } => !!e.imageUrl?.trim())
    .map((e) => ({
      id: `event-${e.id}`,
      title: e.linkUrl?.trim() ? adTitleFromLink(e.linkUrl) : e.title,
      imageUrl: e.imageUrl,
      linkUrl: e.linkUrl?.trim() || "/events",
      sponsorName: e.createdBy?.name || e.createdBy?.username || "MoCoMo",
      ctaLabel: "바로가기",
      adCategory: "광고",
    }));

  const slotAds: FeedAdData[] = slots.map((s) => ({
    id: s.id,
    title: s.title,
    imageUrl: s.imageUrl,
    linkUrl: s.linkUrl,
    sponsorName: s.sponsorName,
    ctaLabel: s.ctaLabel,
    adCategory: s.adCategory ?? "광고",
  }));

  return [...eventAds, ...slotAds];
}

function adTitleFromLink(linkUrl: string): string {
  try {
    const href = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return "광고";
  }
}

export const getCachedFeedAdPool = unstable_cache(
  async () => fetchFeedAdPool(),
  ["feed-ad-pool-v2"],
  { revalidate: 60 }
);
