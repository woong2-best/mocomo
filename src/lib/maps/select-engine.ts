import type { MapEngineId } from "@/lib/maps/types";

/** Normalize ISO country codes used for meet location. */
export function normalizeMeetCountry(country?: string | null): string {
  const c = (country ?? "").trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(c)) return c;
  return "KR";
}

/**
 * Auto-select map engine from country. Users never pick a map service.
 * KR → Kakao · else → MapLibre (+ OSM tiles).
 * google / apple reserved for future providers.
 */
export function selectMapEngine(country?: string | null): MapEngineId {
  return normalizeMeetCountry(country) === "KR" ? "kakao" : "maplibre";
}

export function isKakaoMapCountry(country?: string | null): boolean {
  return selectMapEngine(country) === "kakao";
}
