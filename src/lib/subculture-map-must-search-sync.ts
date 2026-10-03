import { db } from "@/lib/db";
import {
  geocodeEventVenueInCountry,
  isPinCoordinateValid,
} from "@/lib/subculture-event-geocode";
import {
  mustSearchGeocodeQuery,
  SUBCULTURE_MAP_MUST_SEARCH,
  mustSearchExternalKey,
  mustSearchEntryToFetchedEvent,
} from "@/lib/subculture-map-must-search";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** sync 때마다 필수 검색 목록 geocode — Nominatim rate limit 준수 */
export async function geocodeMustSearchSubcultureMapEntries(options?: {
  /** cron 타임아웃 방지 — 기본 전체 */
  max?: number;
}): Promise<number> {
  try {
    await db.subcultureEventPin.findFirst({ select: { id: true } });
  } catch {
    return 0;
  }

  const max = options?.max ?? SUBCULTURE_MAP_MUST_SEARCH.length;
  let updated = 0;

  for (const entry of SUBCULTURE_MAP_MUST_SEARCH.slice(0, max)) {
    const externalKey = mustSearchExternalKey(entry);
    const stub = mustSearchEntryToFetchedEvent(entry);
    const { venueName, address } = mustSearchGeocodeQuery(entry);

    try {
      const coord = await geocodeEventVenueInCountry(entry.country, venueName, address);
      const payload = {
        title: stub.title,
        description: stub.description,
        category: stub.category,
        venueName,
        address: coord?.label ?? address,
        lat:
          coord && isPinCoordinateValid(entry.country, coord.lat, coord.lng)
            ? coord.lat
            : null,
        lng:
          coord && isPinCoordinateValid(entry.country, coord.lat, coord.lng)
            ? coord.lng
            : null,
        startsAt: new Date(stub.startsAt),
        endsAt: new Date(stub.endsAt),
        sourceUrl: stub.sourceUrl,
        source: "seed" as const,
      };

      await db.subcultureEventPin.upsert({
        where: { externalKey },
        create: { externalKey, ...payload },
        update: payload,
      });

      if (payload.lat != null && payload.lng != null) updated += 1;
    } catch {
      /* skip */
    }

    await sleep(1100);
  }

  return updated;
}
