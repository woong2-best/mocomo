import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { kakaoSearchPlace } from "@/lib/kakao-local";
import {
  SUBCULTURE_EVENT_SEEDS,
  SUBCULTURE_EVENT_CATEGORY_LABELS,
  type SubcultureEventCountry,
} from "@/lib/subculture-event-seeds";
import {
  inferEventCountryFromCoords,
  isKoreaEventCountry,
  resolveSubculturePinsForUser,
} from "@/lib/subculture-event-countries";
import { fetchAllSubcultureEvents } from "@/lib/subculture-event-fetch";
import type { FetchedSubcultureEvent } from "@/lib/subculture-event-fetch/types";
import { type MapEventPin } from "@/lib/subculture-event-pins";

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
    .filter((r) => r.lat != null && r.lng != null)
    .map((r) => ({
      id: r.id,
      title: r.title,
      country: inferEventCountry(r.lat!, r.lng!, r.externalKey),
      category: r.category,
      categoryLabel:
        SUBCULTURE_EVENT_CATEGORY_LABELS[r.category] ?? r.category,
      venueName: r.venueName,
      description: r.description,
      lat: r.lat!,
      lng: r.lng!,
      startsAt: r.startsAt.toISOString(),
      endsAt: r.endsAt?.toISOString() ?? null,
      sourceUrl: r.sourceUrl,
      source: r.source,
    }));
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
      take: Math.max(limit * 4, 200),
    });

    const pins = sortMapPins(mapRowsToPins(rows)).slice(0, limit);
    if (pins.length > 0) return pins;
  } catch {
    /* fall through */
  }

  const { events } = await fetchAllSubcultureEvents();
  return sortMapPins(
    events.map((e, i) => ({
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
    }))
  ).slice(0, limit);
}

/** 행사 일정 우선, 메이드 카페(상설)는 뒤로 */
function sortMapPins(pins: MapEventPin[]): MapEventPin[] {
  return [...pins].sort((a, b) => {
    const aMaid = a.category === "maid_cafe" ? 1 : 0;
    const bMaid = b.category === "maid_cafe" ? 1 : 0;
    if (aMaid !== bMaid) return aMaid - bMaid;
    return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
  });
}

/** 캐시된 핀 목록 (읽기 전용, 빠름) — sync는 cron 전용 */
export async function getSubcultureMapPins(limit = 96): Promise<MapEventPin[]> {
  return unstable_cache(
    async () => querySubcultureMapPins(limit),
    ["subculture-map-pins-v7", String(limit)],
    { revalidate: 600, tags: [SUBCULTURE_MAP_PINS_CACHE_TAG] }
  )();
}

/** 사용자 기본 국가에 맞는 행사만 반환 */
export async function getSubcultureMapPinsForUser(
  limit = 48,
  userCountryCode?: string
): Promise<MapEventPin[]> {
  let country = userCountryCode;
  if (!country) {
    const { getRequestCountryCode } = await import("@/lib/i18n/server");
    country = await getRequestCountryCode();
  }
  const all = await getSubcultureMapPins(Math.max(limit * 3, 160));
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
        const payload = {
          title: e.title,
          description: e.description,
          category: e.category,
          venueName: e.venueName,
          address: e.address,
          lat: e.lat,
          lng: e.lng,
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

async function geocodeWithNominatim(query: string): Promise<{ lat: number; lng: number; label: string } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "mocomo-subculture-events/1.0" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { lat: string; lon: string; display_name: string }[];
    const hit = data[0];
    if (!hit) return null;
    return { lat: Number(hit.lat), lng: Number(hit.lon), label: hit.display_name };
  } catch {
    return null;
  }
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
      const country = inferEventCountryFromCoords(row.lat ?? 0, row.lng ?? 0, row.externalKey);
      const coord = isKoreaEventCountry(country)
        ? await kakaoSearchPlace(q)
        : await geocodeWithNominatim(q);
      if (!coord) continue;
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
