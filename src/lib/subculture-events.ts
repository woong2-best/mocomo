import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { kakaoSearchPlace } from "@/lib/kakao-local";
import {
  SUBCULTURE_EVENT_SEEDS,
  SUBCULTURE_EVENT_CATEGORY_LABELS,
  type SubcultureEventCountry,
} from "@/lib/subculture-event-seeds";
import {
  eventCountryFromExternalKey,
  inferEventCountryFromCoords,
  isKoreaEventCountry,
  resolveSubculturePinsForUser,
} from "@/lib/subculture-event-countries";
import { fetchAllSubcultureEvents } from "@/lib/subculture-event-fetch";
import type { FetchedSubcultureEvent } from "@/lib/subculture-event-fetch/types";
import {
  geocodeEventVenueInCountry,
  isGenericVenueTitle,
  isPinCoordinateValid,
  resolveVenueCoordsFromMaster,
  verifiedVenueForEvent,
} from "@/lib/subculture-event-geocode";
import { type MapEventPin } from "@/lib/subculture-event-pins";
import { inferSubcultureEventPhase } from "@/lib/subculture-event-phase";

export type { MapEventPin } from "@/lib/subculture-event-pins";
export { mapLinkForEvent } from "@/lib/subculture-event-pins";

/** DB 메타 행 — 지도에 노출되지 않음 */
export const SUBCULTURE_SYNC_META_KEY = "__sync_meta__";

export const SUBCULTURE_MAP_PINS_CACHE_TAG = "subculture-event-pins";

const SYNC_INTERVAL_MS = 60 * 60 * 1000; // 1시간

function inferEventCountry(
  lat: number,
  lng: number,
  externalKey?: string | null
): SubcultureEventCountry {
  return inferEventCountryFromCoords(lat, lng, externalKey);
}

function isValidPinRow(row: {
  title: string;
  venueName: string | null;
  lat: number | null;
  lng: number | null;
  externalKey: string | null;
}): boolean {
  if (row.externalKey?.startsWith("auto-wiki-")) return false;
  const verified = verifiedVenueForEvent(row.externalKey);
  if (verified) return true;
  if (row.lat == null || row.lng == null) return false;
  if (isGenericVenueTitle(row.title) || (row.venueName && isGenericVenueTitle(row.venueName))) {
    return false;
  }
  const country =
    eventCountryFromExternalKey(row.externalKey) ??
    inferEventCountryFromCoords(row.lat, row.lng, row.externalKey);
  return isPinCoordinateValid(country, row.lat, row.lng);
}

function mapRowsToPins(
  rows: {
    id: string;
    title: string;
    category: string;
    venueName: string | null;
    description: string | null;
    lat: number | null;
    lng: number | null;
    startsAt: Date;
    endsAt: Date | null;
    sourceUrl: string | null;
    source: string;
    externalKey: string | null;
  }[]
): MapEventPin[] {
  return rows
    .filter(isValidPinRow)
    .map((r) => {
      const verified = verifiedVenueForEvent(r.externalKey);
      const lat = verified?.lat ?? r.lat!;
      const lng = verified?.lng ?? r.lng!;
      const startsAt = r.startsAt.toISOString();
      const endsAt = r.endsAt?.toISOString() ?? null;
      return {
        id: r.id,
        title: r.title,
        country: inferEventCountry(lat, lng, r.externalKey),
        category: r.category,
        categoryLabel:
          SUBCULTURE_EVENT_CATEGORY_LABELS[r.category] ?? r.category,
        venueName: verified?.venueName ?? r.venueName,
        description: r.description,
        lat,
        lng,
        startsAt,
        endsAt,
        sourceUrl: r.sourceUrl,
        source: r.source,
        phase: inferSubcultureEventPhase(startsAt, endsAt, r.category),
        imageUrl: null,
        roadViewImageUrl: null,
      };
    });
}

/** DB 조회 — cron이 1시간마다 공식 사이트에서 자동 수집 반영 */
export async function querySubcultureMapPins(limit: number): Promise<MapEventPin[]> {
  const now = new Date();
  try {
    const rows = await db.subcultureEventPin.findMany({
      where: {
        externalKey: { not: SUBCULTURE_SYNC_META_KEY },
        lat: { not: null },
        lng: { not: null },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
      orderBy: { startsAt: "asc" },
      take: Math.max(limit * 4, 500),
    });

    const pins = sortMapPins(mapRowsToPins(rows)).slice(0, limit);
    if (pins.length > 0) return pins;
  } catch {
    /* fall through */
  }

  const { events } = await fetchAllSubcultureEvents();
  return sortMapPins(
    events
      .filter((e) => {
        if (e.externalKey.startsWith("auto-wiki-")) return false;
        if (isGenericVenueTitle(e.title) || isGenericVenueTitle(e.venueName)) return false;
        return isPinCoordinateValid(
          e.country ?? eventCountryFromExternalKey(e.externalKey) ?? "other",
          e.lat,
          e.lng
        );
      })
      .map((e, i) => ({
        id: `auto-fallback-${e.externalKey}-${i}`,
        title: e.title,
        country: e.country,
        category: e.category,
        categoryLabel: SUBCULTURE_EVENT_CATEGORY_LABELS[e.category] ?? e.category,
        venueName: e.venueName,
        description: e.description ?? null,
        lat: e.lat,
        lng: e.lng,
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        sourceUrl: e.officialNoticeUrl ?? e.sourceUrl,
        source: e.externalKey.startsWith("auto-") ? "auto" : "official",
        phase: inferSubcultureEventPhase(e.startsAt, e.endsAt, e.category),
        imageUrl: e.imageUrl ?? null,
        roadViewImageUrl: e.roadViewImageUrl ?? null,
      }))
  ).slice(0, limit);
}

/** 진행 중 → 예정 → 상설(메이드) 순, 각 그룹 내 시작일 오름차순 */
function sortMapPins(pins: MapEventPin[]): MapEventPin[] {
  const phaseRank = (p: MapEventPin) => {
    if (p.phase === "ongoing") return 0;
    if (p.phase === "upcoming") return 1;
    if (p.phase === "permanent") return 2;
    return 3;
  };
  return [...pins].sort((a, b) => {
    const pr = phaseRank(a) - phaseRank(b);
    if (pr !== 0) return pr;
    return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
  });
}

/** 캐시된 핀 목록 (읽기 전용, 빠름) — sync는 cron 전용 */
export async function getSubcultureMapPins(limit = 240): Promise<MapEventPin[]> {
  return unstable_cache(
    async () => querySubcultureMapPins(limit),
    ["subculture-map-pins-v12", String(limit)],
    { revalidate: 600, tags: [SUBCULTURE_MAP_PINS_CACHE_TAG] }
  )();
}

/** 사용자 기본 국가에 맞는 행사만 반환 */
export async function getSubcultureMapPinsForUser(
  limit = 120,
  userCountryCode?: string
): Promise<MapEventPin[]> {
  let country = userCountryCode;
  if (!country) {
    const { getRequestCountryCode } = await import("@/lib/i18n/server");
    country = await getRequestCountryCode();
  }
  const all = await getSubcultureMapPins(Math.max(limit * 3, 320));
  return resolveSubculturePinsForUser(all, country).slice(0, limit);
}

export async function upsertFetchedSubcultureEvents(
  events: FetchedSubcultureEvent[]
): Promise<number> {
  const chunkSize = 8;
  for (let i = 0; i < events.length; i += chunkSize) {
    const chunk = events.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (e) => {
        if (e.externalKey.startsWith("auto-wiki-")) return;
        const verified = verifiedVenueForEvent(e.externalKey);
        const country = e.country ?? eventCountryFromExternalKey(e.externalKey) ?? "other";
        const fromMaster =
          !verified && resolveVenueCoordsFromMaster(country, e.venueName, e.address);
        const coordsValid = verified
          ? true
          : fromMaster
            ? true
            : e.lat != null &&
              e.lng != null &&
              isPinCoordinateValid(country, e.lat, e.lng) &&
              !isGenericVenueTitle(e.title) &&
              !isGenericVenueTitle(e.venueName);
        const payload = {
          title: e.title,
          description: e.description,
          category: e.category,
          venueName: verified?.venueName ?? fromMaster?.venueName ?? e.venueName,
          address: verified?.address ?? fromMaster?.label ?? e.address,
          lat: verified ? verified.lat : fromMaster?.lat ?? coordsValid ? e.lat : null,
          lng: verified ? verified.lng : fromMaster?.lng ?? coordsValid ? e.lng : null,
          startsAt: new Date(e.startsAt),
          endsAt: new Date(e.endsAt),
          sourceUrl: e.officialNoticeUrl ?? e.sourceUrl,
          source: e.externalKey.startsWith("auto-")
            ? "auto"
            : e.externalKey.startsWith("venue-")
              ? "seed"
              : "official",
        };
        try {
          await db.subcultureEventPin.upsert({
            where: { externalKey: e.externalKey },
            create: { externalKey: e.externalKey, ...payload },
            update: payload,
          });
        } catch (err) {
          console.error("[subculture-events] upsert failed", e.externalKey, err);
        }
      })
    );
  }

  try {
    const validKeys = [...events.map((e) => e.externalKey), SUBCULTURE_SYNC_META_KEY];
    await db.subcultureEventPin.deleteMany({
      where: {
        source: { in: ["seed", "official", "auto"] },
        externalKey: { notIn: validKeys },
      },
    });
  } catch {
    /* ignore */
  }

  return events.length;
}

/** Wikipedia·잘못된 좌표 핀 정리 */
export async function purgeInvalidSubculturePins(): Promise<number> {
  try {
    const wikiRemoved = await db.subcultureEventPin.deleteMany({
      where: { externalKey: { startsWith: "auto-wiki-" } },
    });

    const rows = await db.subcultureEventPin.findMany({
      where: { lat: { not: null }, lng: { not: null } },
      select: {
        id: true,
        title: true,
        venueName: true,
        lat: true,
        lng: true,
        externalKey: true,
      },
    });

    let nulled = 0;
    for (const row of rows) {
      if (!isValidPinRow(row)) {
        await db.subcultureEventPin.update({
          where: { id: row.id },
          data: { lat: null, lng: null },
        });
        nulled += 1;
      }
    }
    return wikiRemoved.count + nulled;
  } catch {
    return 0;
  }
}

/** @deprecated upsertFetchedSubcultureEvents 사용 */
export async function ensureSubcultureEventSeeds(): Promise<void> {
  await upsertFetchedSubcultureEvents(
    SUBCULTURE_EVENT_SEEDS.map((s) => ({
      ...s,
      country: s.country ?? "kr",
      sourceId: "seed",
    }))
  );
}

async function touchSubcultureSyncMeta(): Promise<void> {
  const now = new Date();
  try {
    await db.subcultureEventPin.upsert({
      where: { externalKey: SUBCULTURE_SYNC_META_KEY },
      create: {
        externalKey: SUBCULTURE_SYNC_META_KEY,
        title: "Subculture event sync",
        category: "other",
        source: "system",
        startsAt: now,
        endsAt: now,
      },
      update: {},
    });
  } catch {
    /* ignore */
  }
}

async function isSubcultureSyncDue(): Promise<boolean> {
  try {
    const meta = await db.subcultureEventPin.findUnique({
      where: { externalKey: SUBCULTURE_SYNC_META_KEY },
      select: { updatedAt: true },
    });
    if (!meta) return true;
    return Date.now() - meta.updatedAt.getTime() >= SYNC_INTERVAL_MS;
  } catch {
    return true;
  }
}

/** 공식 사이트 자동 수집 + DB 반영 — cron 1시간마다 */
export async function syncSubcultureEventsIfDue(options?: {
  force?: boolean;
  geocodeMax?: number;
}): Promise<{
  synced: boolean;
  geocoded: number;
  fetched: number;
  fetchErrors: string[];
}> {
  const force = options?.force ?? false;
  const geocodeMax = options?.geocodeMax ?? 5;

  if (!force && !(await isSubcultureSyncDue())) {
    return { synced: false, geocoded: 0, fetched: 0, fetchErrors: [] };
  }

  const { events, results } = await fetchAllSubcultureEvents();
  await upsertFetchedSubcultureEvents(events);
  const geocoded = await geocodePendingSubcultureEvents(geocodeMax);
  const purged = await purgeInvalidSubculturePins();
  if (purged > 0) {
    console.info("[subculture-events] purged invalid pins:", purged);
  }
  await touchSubcultureSyncMeta();

  try {
    const { revalidateTag } = await import("next/cache");
    revalidateTag(SUBCULTURE_MAP_PINS_CACHE_TAG);
  } catch {
    /* ignore */
  }

  return {
    synced: true,
    geocoded,
    fetched: events.length,
    fetchErrors: results.filter((r) => r.error).map((r) => `${r.sourceId}: ${r.error}`),
  };
}

/** 좌표 없는 행사 — 한국은 카카오, 그 외 Nominatim (cron·수동) */
export async function geocodePendingSubcultureEvents(max = 5): Promise<number> {
  try {
    await db.subcultureEventPin.findFirst({ select: { id: true } });
  } catch {
    return 0;
  }

  const pending = await db.subcultureEventPin.findMany({
    where: {
      externalKey: { not: SUBCULTURE_SYNC_META_KEY },
      OR: [{ lat: null }, { lng: null }],
      venueName: { not: null },
    },
    take: max,
  });

  let updated = 0;
  for (const row of pending) {
    const q = [row.venueName, row.address].filter(Boolean).join(" ");
    if (!q.trim()) continue;
    try {
      const country =
        eventCountryFromExternalKey(row.externalKey) ??
        inferEventCountryFromCoords(row.lat ?? 0, row.lng ?? 0, row.externalKey);

      const fromMaster = resolveVenueCoordsFromMaster(country, row.venueName, row.address);
      if (fromMaster) {
        await db.subcultureEventPin.update({
          where: { id: row.id },
          data: {
            lat: fromMaster.lat,
            lng: fromMaster.lng,
            address: fromMaster.label,
            venueName: fromMaster.venueName,
          },
        });
        updated += 1;
        continue;
      }

      const coord = isKoreaEventCountry(country)
        ? await kakaoSearchPlace(q)
        : await geocodeEventVenueInCountry(country, row.venueName, row.address);
      if (!coord || !isPinCoordinateValid(country, coord.lat, coord.lng)) continue;
      await db.subcultureEventPin.update({
        where: { id: row.id },
        data: { lat: coord.lat, lng: coord.lng, address: coord.label },
      });
      updated += 1;
    } catch {
      /* skip */
    }
  }
  return updated;
}
