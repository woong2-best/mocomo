import { mixFeedWithAds } from "@/lib/feed-mixer";
import { FALLBACK_FEED_ADS, type FeedAdData } from "@/lib/default-ads";
import { FeedInfinite } from "@/components/feed/feed-infinite";
import { HomePageClient } from "@/components/home/home-page-client";
import { getCachedFeedAds, getCachedFeedPosts } from "@/lib/cached-data";

export const revalidate = 60;

export default async function HomePage() {
  type FeedItem = Parameters<typeof FeedInfinite>[0]["initialItems"][number];
  let feedItems: FeedItem[] = [];
  let nextCursor: string | null = null;
  let dbOk = true;

  try {
    const [posts, feedAds] = await Promise.all([getCachedFeedPosts(), getCachedFeedAds()]);

    const ads: FeedAdData[] = feedAds.length > 0 ? feedAds : [...FALLBACK_FEED_ADS];
    const mixed = mixFeedWithAds(posts, ads, 6);

    feedItems = mixed.map((item) =>
      item.type === "post"
        ? ({
            type: "post" as const,
            data: { ...item.data, createdAt: item.data.createdAt.toISOString() },
          } as unknown as FeedItem)
        : ({ type: "ad" as const, data: item.data } as unknown as FeedItem)
    );
    nextCursor = posts.length === 12 ? posts[posts.length - 1]?.id ?? null : null;
  } catch (e) {
    dbOk = false;
    console.error("[home]", e);
  }

  const hasDbPosts = feedItems.some((i) => i.type === "post");

  return (
    <HomePageClient
      feedItems={feedItems}
      nextCursor={nextCursor}
      dbOk={dbOk}
      hasDbPosts={hasDbPosts}
    />
  );
}
