import type { MapEngineId } from "@/maps/types";

export function normalizeMeetCountry(country?: string | null): string {
  const c = (country ?? "").trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(c)) return c;
  return "KR";
}

/** Embedded maps: MapLibre globally. External links: Google Maps. */
export function selectMapEngine(_country?: string | null): MapEngineId {
  return "maplibre";
}
