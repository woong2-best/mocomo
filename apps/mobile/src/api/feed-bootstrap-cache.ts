/**
 * Disk bootstrap for Home feed — Instagram/Twitter-class cold start.
 * Shows last first page instantly while network refresh runs. Features unchanged.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { InfiniteData } from "@tanstack/react-query";
import type { FeedPage } from "@/api/feed";

const KEY = "mocomo.mobile-feed.v1";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

type Stored = {
  savedAt: number;
  data: InfiniteData<FeedPage, string | null>;
};

export async function loadFeedBootstrap(): Promise<InfiniteData<FeedPage, string | null> | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    if (!parsed?.data?.pages?.length) return null;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export async function saveFeedBootstrap(
  data: InfiniteData<FeedPage, unknown>
): Promise<void> {
  try {
    const slim: InfiniteData<FeedPage, string | null> = {
      pages: data.pages.slice(0, 1),
      pageParams: (data.pageParams.slice(0, 1) as (string | null)[]) ?? [null],
    };
    const payload: Stored = { savedAt: Date.now(), data: slim };
    await AsyncStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // Disk full / private mode — ignore
  }
}

export async function clearFeedBootstrap(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
