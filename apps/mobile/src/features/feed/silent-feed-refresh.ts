import type { QueryClient } from "@tanstack/react-query";
import { fetchFeedPage, type FeedItem } from "@/api/feed";
import {
  diffAndPatchFeed,
  prependFeedItems,
  type InfiniteFeedData,
} from "@/features/feed/feed-merge";
import { MOBILE_FEED_PAGE_SIZE, MOBILE_FEED_QUERY_KEY } from "@/features/feed/mobile-feed-query";

export {
  diffAndPatchFeed,
  feedHasVisiblePosts,
  feedItemKey,
  prependFeedItems,
  type InfiniteFeedData,
} from "@/features/feed/feed-merge";

let inflight: Promise<FeedItem[]> | null = null;

/**
 * Fetch page 1 without resetting the ad mixer or replacing older pages.
 * When `prependNew` is false, new posts are returned so the UI can show a pill.
 */
export function silentRefreshHomeFeed(
  queryClient: QueryClient,
  options?: { prependNew?: boolean }
): Promise<FeedItem[]> {
  if (inflight) return inflight;
  inflight = (async () => {
    const fresh = await fetchFeedPage(null, MOBILE_FEED_PAGE_SIZE, 0);
    const existing = queryClient.getQueryData<InfiniteFeedData>(MOBILE_FEED_QUERY_KEY);
    let { next, newItems } = diffAndPatchFeed(existing, fresh);
    if (options?.prependNew && newItems.length > 0) {
      next = prependFeedItems(next, newItems);
      newItems = [];
    }
    queryClient.setQueryData(MOBILE_FEED_QUERY_KEY, next);
    return newItems;
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}
