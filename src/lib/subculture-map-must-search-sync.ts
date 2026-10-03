import { db } from "@/lib/db";
import {
  geocodeEventVenueInCountry,
  isPinCoordinateValid,
} from "@/lib/subculture-event-geocode";
import {
  getActiveMustSearchEntries,
  mustSearchGeocodeQuery,
  mustSearchExternalKey,
  mustSearchEntryToFetchedEvent,
  RETIRED_MUST_SEARCH_EXTERNAL_KEYS,
} from "@/lib/subculture-map-must-search";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** 폐업·목록 제외 매장 — DB 핀 삭제 */
export async function purgeRetiredMustSearchPins(): Promise<number> {
  try {
    const removed = await db.subcultureEventPin.deleteMany({
      where: { externalKey: { in: [...RETIRED_MUST_SEARCH_EXTERNAL_KEYS] } },
    });
    return removed.count;
  } catch {
    return 0;
  }
}

/** API 없이 카탈로그 좌표만 DB upsert — cron·배경 sync용 (빠름) */
export async function upsertMustSearchCatalogPinsFast(): Promise<number> {
  try {
    await db.subcultureEventPin.findFirst({ select: { id: true } });
  } catch {
    return 0;
  }

  let written = 0;
  for (const entry of getActiveMustSearchEntries()) {
    const externalKey = mustSearchExternalKey(entry);
    const stub = mustSearchEntryToFetchedEvent(entry);
    if (
      !stub.lat ||
      !stub.lng ||
      !isPinCoordinateValid(entry.country, stub.lat, stub.lng)
    ) {
      continue;
    }
    const { venueName, address } = mustSearchGeocodeQuery(entry);
    try {
      await db.subcultureEventPin.upsert({
        where: { externalKey },
        create: {
          externalKey,
          title: stub.title,
          description: stub.description,
          category: stub.category,
          venueName,
          address,
          lat: stub.lat,
          lng: stub.lng,
          startsAt: new Date(stub.startsAt),
          endsAt: new Date(stub.endsAt),
          sourceUrl: stub.sourceUrl,
          source: "seed",
        },
        update: {
          title: stub.title,
          description: stub.description,
          category: stub.category,
          venueName,
          address,
          lat: stub.lat,
          lng: stub.lng,
          startsAt: new Date(stub.startsAt),
          endsAt: new Date(stub.endsAt),
          sourceUrl: stub.sourceUrl,
        },
      });
      written += 1;
    } catch {
      /* skip */
    }
  }
  return written;
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

  const active = getActiveMustSearchEntries();
  const max = options?.max ?? active.length;
  let updated = 0;

  const total = active.length;
  const offset =
    total > 0 ? Math.floor(Date.now() / (60 * 60 * 1000)) % Math.max(1, Math.ceil(total / max)) : 0;
  const start = (offset * max) % total;
  const rotated = [...active.slice(start), ...active.slice(0, start)].slice(0, max);

  for (const entry of rotated) {
    const externalKey = mustSearchExternalKey(entry);
    const stub = mustSearchEntryToFetchedEvent(entry);
    const { venueName, address } = mustSearchGeocodeQuery(entry);

    let lat =
      stub.lat && isPinCoordinateValid(entry.country, stub.lat, stub.lng) ? stub.lat : null;
    let lng =
      stub.lng && isPinCoordinateValid(entry.country, stub.lat, stub.lng) ? stub.lng : null;
    let addressLabel = address;

    try {
      const coord = await geocodeEventVenueInCountry(entry.country, venueName, address);
      if (coord && isPinCoordinateValid(entry.country, coord.lat, coord.lng)) {
        lat = coord.lat;
        lng = coord.lng;
        addressLabel = coord.label;
      }

      const payload = {
        title: stub.title,
        description: stub.description,
        category: stub.category,
        venueName,
        address: addressLabel,
        lat,
        lng,
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
