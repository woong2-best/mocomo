import { eventCountryFromExternalKey } from "@/lib/subculture-event-countries";
import { isPinCoordinateValid } from "@/lib/subculture-event-geocode";
import type { MapEventPin } from "@/lib/subculture-event-pins";
import { inferSubcultureEventPhase } from "@/lib/subculture-event-phase";
import { SUBCULTURE_EVENT_CATEGORY_LABELS } from "@/lib/subculture-event-types";
import { getMustSearchFetchedSubcultureEvents } from "@/lib/subculture-map-must-search";

/** must-search 카탈로그 → 지도 핀 (DB sync 없이도 표시) */
export function mustSearchCatalogToMapPins(): MapEventPin[] {
  const pins: MapEventPin[] = [];
  for (const e of getMustSearchFetchedSubcultureEvents()) {
    const country = e.country ?? eventCountryFromExternalKey(e.externalKey) ?? "kr";
    if (!isPinCoordinateValid(country, e.lat, e.lng)) continue;
    const startsAt = e.startsAt;
    const endsAt = e.endsAt;
    pins.push({
      id: e.externalKey,
      title: e.title,
      country,
      category: e.category,
      categoryLabel: SUBCULTURE_EVENT_CATEGORY_LABELS[e.category] ?? e.category,
      venueName: e.venueName,
      description: e.description ?? null,
      lat: e.lat,
      lng: e.lng,
      startsAt,
      endsAt,
      sourceUrl: e.sourceUrl,
      source: "seed",
      phase: inferSubcultureEventPhase(startsAt, endsAt, e.category),
      imageUrl: null,
      roadViewImageUrl: null,
    });
  }
  return pins;
}

/** 카탈로그 must-search 핀은 항상 포함 (이벤트 limit에 밀리지 않음) */
export function mergeMapPinsWithMustSearchCatalog(
  dbPins: MapEventPin[],
  limit: number
): MapEventPin[] {
  const catalog = mustSearchCatalogToMapPins();
  const catalogIds = new Set(catalog.map((p) => p.id));
  const rest = dbPins.filter((p) => !catalogIds.has(p.id));
  const combined = [...catalog, ...rest];
  const sorted = combined.sort((a, b) => {
    const phaseRank = (p: MapEventPin) => {
      if (p.phase === "ongoing") return 0;
      if (p.phase === "upcoming") return 1;
      if (p.phase === "permanent") return 2;
      return 3;
    };
    const pr = phaseRank(a) - phaseRank(b);
    if (pr !== 0) return pr;
    return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
  });
  return sorted.slice(0, Math.max(limit, catalog.length));
}
