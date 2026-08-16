import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "mocomo:recent-communities";
const MAX_RECENT = 12;

export type RecentCommunity = {
  slug: string;
  name: string;
  visitedAt: number;
};

async function readRecent(): Promise<RecentCommunity[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentCommunity[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => x?.slug && x?.name).slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

async function writeRecent(items: RecentCommunity[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_RECENT)));
  } catch {
    /* ignore quota */
  }
}

export async function getRecentCommunities() {
  return readRecent();
}

export async function trackRecentCommunity(slug: string, name: string) {
  if (!slug || !name) return;
  const prev = (await readRecent()).filter((x) => x.slug !== slug);
  await writeRecent([{ slug, name, visitedAt: Date.now() }, ...prev]);
}

export async function removeRecentCommunity(slug: string) {
  await writeRecent((await readRecent()).filter((x) => x.slug !== slug));
}
