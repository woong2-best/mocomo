import { fetchFeedPage, type FeedPage } from "@/api/feed";
import {
  addFeedPostOffset,
  getFeedPostOffset,
  resetFeedPostOffset,
} from "@/features/feed/feed-post-offset";

export const MOBILE_FEED_QUERY_KEY = ["mobile-feed"] as const;
export const MOBILE_FEED_PAGE_SIZE = 20;
/** Short enough that a cold/empty first page is not stuck for 90s. */
export const MOBILE_FEED_STALE_MS = 30_000;

export async function fetchMobileFeedInfinitePage({
  pageParam,
}: {
  pageParam: string | null;
}): Promise<FeedPage> {
  if (!pageParam) resetFeedPostOffset();
  const offset = getFeedPostOffset();
  const page = await fetchFeedPage(pageParam, MOBILE_FEED_PAGE_SIZE, offset);
  addFeedPostOffset(page.items.filter((item) => item.type === "post").length);
  return page;
}
