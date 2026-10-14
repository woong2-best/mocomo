const STORAGE_KEY = "mocomo.recent-searches.v1";
export const MAX_RECENT_SEARCHES_PER_SCOPE = 5;

type RecentMap = Record<string, string[]>;

function readMap(): RecentMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: RecentMap = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!Array.isArray(value)) continue;
      out[key] = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    }
    return out;
  } catch {
    return {};
  }
}

function writeMap(map: RecentMap) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function loadRecentSearches(scope: string): string[] {
  const map = readMap();
  const stored = map[scope] ?? [];
  const next = stored.slice(0, MAX_RECENT_SEARCHES_PER_SCOPE);
  if (stored.length > next.length && typeof window !== "undefined") {
    map[scope] = next;
    writeMap(map);
  }
  return next;
}

export function rememberRecentSearch(scope: string, q: string): string[] {
  const trimmed = q.trim();
  if (!trimmed || typeof window === "undefined") return loadRecentSearches(scope);
  const map = readMap();
  const next = [trimmed, ...(map[scope] ?? []).filter((item) => item !== trimmed)].slice(
    0,
    MAX_RECENT_SEARCHES_PER_SCOPE
  );
  map[scope] = next;
  writeMap(map);
  return next;
}

export function removeRecentSearch(scope: string, q: string): string[] {
  const trimmed = q.trim();
  if (!trimmed || typeof window === "undefined") return loadRecentSearches(scope);
  const map = readMap();
  const next = (map[scope] ?? [])
    .filter((item) => item !== trimmed)
    .slice(0, MAX_RECENT_SEARCHES_PER_SCOPE);
  map[scope] = next;
  writeMap(map);
  return next;
}
