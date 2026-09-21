import type { FeedLayoutItem } from "@/components/feed/feed-dual-column-layout";

const STORAGE_PREFIX = "mocomo-home-feed-v1";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const HOME_FEED_QUERY_KEY = ["home-feed"] as const;

export type HomeFeedCachePayload = {
  userId: string;
  items: FeedLayoutItem[];
  nextCursor: string | null;
  likedIds: string[];
  starredIds: string[];
  repostedIds: string[];
  savedAt: number;
};

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}

export function homeFeedViewerKey(userId: string | null | undefined): string {
  return userId?.trim() || "guest";
}

export function readHomeFeedCache(userId: string): HomeFeedCachePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HomeFeedCachePayload;
    if (!parsed || !Array.isArray(parsed.items)) return null;
    if (Date.now() - (parsed.savedAt ?? 0) > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeHomeFeedCache(
  payload: Omit<HomeFeedCachePayload, "savedAt">
): void {
  if (typeof window === "undefined") return;
  try {
    const body: HomeFeedCachePayload = { ...payload, savedAt: Date.now() };
    window.localStorage.setItem(storageKey(payload.userId), JSON.stringify(body));
  } catch {
    /* quota / private mode */
  }
}
