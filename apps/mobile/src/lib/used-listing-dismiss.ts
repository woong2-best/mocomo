import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "mocomo_used_listing_dismissed";
const MAX = 200;

export async function loadDismissedUsedListingIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return new Set();
    const ids = JSON.parse(raw) as unknown;
    if (!Array.isArray(ids)) return new Set();
    return new Set(ids.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

export async function dismissUsedListing(id: string): Promise<void> {
  const set = await loadDismissedUsedListingIds();
  set.add(id);
  const list = [...set].slice(-MAX);
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}
