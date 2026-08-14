import AsyncStorage from "@react-native-async-storage/async-storage";

export type RecentMarketView = {
  listingId: string;
  title: string;
  coverUrl: string | null;
  tags: string[];
  viewedAt: number;
};

const STORAGE_KEY = "mocomo-market-recent-views";
const MAX = 30;

async function read(): Promise<RecentMarketView[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentMarketView[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function getRecentMarketViews(): Promise<RecentMarketView[]> {
  return read();
}

export async function recordRecentMarketView(item: Omit<RecentMarketView, "viewedAt">) {
  const list = await read();
  const next: RecentMarketView = { ...item, viewedAt: Date.now() };
  const filtered = list.filter((x) => x.listingId !== item.listingId);
  filtered.unshift(next);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, MAX)));
}

export async function collectRecentTags(limit = 12): Promise<string[]> {
  const list = await read();
  const tags = new Set<string>();
  for (const row of list) {
    for (const t of row.tags) {
      const n = t.trim().replace(/^#/, "");
      if (n) tags.add(n);
      if (tags.size >= limit) return [...tags];
    }
  }
  return [...tags];
}

export async function recentListingIds(): Promise<string[]> {
  const list = await read();
  return list.map((x) => x.listingId);
}
