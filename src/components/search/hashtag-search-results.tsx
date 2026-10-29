import { SearchPageFeed } from "@/components/search/search-page-feed";
import { getCachedHashtagPosts } from "@/lib/hashtag-search";
import { getAuthUserId } from "@/lib/auth";
import { attachWebPaidMediaPlayback } from "@/lib/paid-media-playback";
import { isPaymentsConfigured } from "@/lib/payments";
import type { SearchPageFilter } from "@/lib/search-page-shared";
import type { GridPost } from "@/components/feed/feed-post-card";

export async function HashtagSearchResults({
  tag,
  query,
  filter,
  scope = "global",
}: {
  tag: string;
  query: string;
  filter: SearchPageFilter;
  scope?: "global" | "social";
}) {
  const viewerId = await getAuthUserId();
  const [postsTopRaw, postsLatestRaw] = await Promise.all([
    getCachedHashtagPosts(tag, "top"),
    getCachedHashtagPosts(tag, "latest"),
  ]);
  const [postsTop, postsLatest] = await Promise.all([
    attachWebPaidMediaPlayback(postsTopRaw, viewerId),
    attachWebPaidMediaPlayback(postsLatestRaw, viewerId),
  ]);

  return (
    <SearchPageFeed
      query={query}
      scope={scope}
      initialFilter={filter}
      users={[]}
      postsTop={postsTop as Array<GridPost & { createdAt: string | Date }>}
      postsLatest={postsLatest as Array<GridPost & { createdAt: string | Date }>}
      animes={[]}
      related={[]}
      viewerId={viewerId}
      paymentsEnabled={isPaymentsConfigured()}
    />
  );
}
