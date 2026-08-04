import type { MapEngineId } from "@/maps/types";

export function normalizeMeetCountry(country?: string | null): string {
  const c = (country ?? "").trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(c)) return c;
  return "KR";
}

/** KR → Kakao Native · else → MapLibre Native + OSM. */
export function selectMapEngine(country?: string | null): MapEngineId {
  return normalizeMeetCountry(country) === "KR" ? "kakao" : "maplibre";
}

export function isKakaoMapCountry(country?: string | null): boolean {
  return selectMapEngine(country) === "kakao";
}
