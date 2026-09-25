import AsyncStorage from "@react-native-async-storage/async-storage";

const SEARCH_KEY = "mocomo.market.recent-q";
const VIEW_KEY = "mocomo.market.recent-ids";

async function readList(key: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string" && v.length > 0) : [];
  } catch {
    return [];
  }
}

async function writeFront(key: string, value: string, max: number) {
  const next = [value, ...(await readList(key)).filter((item) => item !== value)].slice(0, max);
  await AsyncStorage.setItem(key, JSON.stringify(next));
  return next;
}

export function loadRecentSearches() {
  return readList(SEARCH_KEY);
}

export function rememberSearch(q: string) {
  const trimmed = q.trim();
  if (!trimmed) return loadRecentSearches();
  return writeFront(SEARCH_KEY, trimmed, 8);
}

export async function clearRecentSearches() {
  await AsyncStorage.removeItem(SEARCH_KEY);
  return [] as string[];
}

export function loadRecentViews() {
  return readList(VIEW_KEY);
}

export function rememberViewedListing(id: string) {
  if (!id) return loadRecentViews();
  return writeFront(VIEW_KEY, id, 20);
}
