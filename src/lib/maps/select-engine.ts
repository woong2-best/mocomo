import type { MapEngineId } from "@/lib/maps/types";

/** Normalize ISO country codes used for meet location. */
export function normalizeMeetCountry(country?: string | null): string {
  const c = (country ?? "").trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(c)) return c;
  return "KR";
}

/**
 * Auto-select map engine from country. Users never pick a map service.
 * Embedded maps use MapLibre globally; external links use Google Maps.
 */
export function selectMapEngine(_country?: string | null): MapEngineId {
  return "maplibre";
}
