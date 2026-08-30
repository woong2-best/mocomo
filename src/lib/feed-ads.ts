import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import type { FeedAdData } from "@/lib/default-ads";

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
    db.event.findMany({
      where: {
        endsAt: { gte: new Date() },
        createdById: { not: null },
        registrationFeePaid: true,
        status: "PUBLISHED",
        imageUrl: { not: null },
      },
      select: {
        id: true,
        title: true,
        imageUrl: true,
        linkUrl: true,
        createdBy: { select: { name: true, username: true } },
      },
      orderBy: { startsAt: "asc" },
      take: 24,
    }),
  ]);

  const eventAds: FeedAdData[] = events
    .filter((e): e is typeof e & { imageUrl: string } => !!e.imageUrl?.trim())
    .map((e) => ({
      id: `event-${e.id}`,
      title: e.title,
      imageUrl: e.imageUrl,
      linkUrl: e.linkUrl?.trim() || "/events",
      sponsorName: e.createdBy?.name || e.createdBy?.username || "MoCoMo",
      ctaLabel: "참가하기",
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

export const getCachedFeedAdPool = unstable_cache(
  async () => fetchFeedAdPool(),
  ["feed-ad-pool-v1"],
  { revalidate: 60 }
);
