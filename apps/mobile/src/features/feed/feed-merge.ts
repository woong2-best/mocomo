import type { InfiniteData } from "@tanstack/react-query";
import type { FeedItem, FeedPage } from "../../api/feed";

export type InfiniteFeedData = InfiniteData<FeedPage, string | null>;

export function feedItemKey(item: FeedItem): string {
  if (item.type === "ad") return `ad-${item.data.id}`;
  return item.data.activityKey ?? item.data.id;
}

export function feedHasVisiblePosts(data: InfiniteFeedData | undefined): boolean {
  const items = data?.pages?.[0]?.items ?? [];
  return items.some(
    (item) => item.type === "post" && !!item.data?.id && !!item.data?.author?.id
  );
}

/** Patch like/comment counts in place; collect posts that are not in the cache yet. */
export function diffAndPatchFeed(
  existing: InfiniteFeedData | undefined,
  fresh: FeedPage
): { next: InfiniteFeedData; newItems: FeedItem[] } {
  if (!existing?.pages?.length) {
    return {
      next: { pages: [fresh], pageParams: [null] },
      newItems: [],
    };
  }

  const seen = new Set<string>();
  for (const page of existing.pages) {
    for (const item of page.items) seen.add(feedItemKey(item));
  }

  const freshPosts = new Map<string, FeedItem>();
  const newItems: FeedItem[] = [];
  for (const item of fresh.items) {
    if (item.type !== "post" || !item.data?.id) continue;
    const key = feedItemKey(item);
    freshPosts.set(key, item);
    if (!seen.has(key)) newItems.push(item);
  }

  const pages = existing.pages.map((page, index) => ({
    ...page,
    paymentsEnabled: index === 0 ? (fresh.paymentsEnabled ?? page.paymentsEnabled) : page.paymentsEnabled,
    likedIds: index === 0 ? fresh.likedIds : page.likedIds,
    starredIds: index === 0 ? fresh.starredIds : page.starredIds,
    repostedIds: index === 0 ? fresh.repostedIds : page.repostedIds,
    items: page.items.map((item) => {
      if (item.type !== "post") return item;
      return freshPosts.get(feedItemKey(item)) ?? item;
    }),
  }));

  return { next: { ...existing, pages }, newItems };
}

export function prependFeedItems(
  existing: InfiniteFeedData,
  newItems: FeedItem[]
): InfiniteFeedData {
  if (newItems.length === 0 || !existing.pages[0]) return existing;
  const seen = new Set(existing.pages.flatMap((page) => page.items.map(feedItemKey)));
  const unique = newItems.filter((item) => !seen.has(feedItemKey(item)));
  if (unique.length === 0) return existing;
  const pages = existing.pages.slice();
  const first = pages[0];
  pages[0] = { ...first, items: [...unique, ...first.items] };
  return { ...existing, pages };
}
