import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { kakaoSearchPlace } from "@/lib/kakao-local";
import {
  SUBCULTURE_EVENT_SEEDS,
  SUBCULTURE_EVENT_CATEGORY_LABELS,
  type SubcultureEventCountry,
} from "@/lib/subculture-event-seeds";
import { fetchAllSubcultureEvents } from "@/lib/subculture-event-fetch";
import type { FetchedSubcultureEvent } from "@/lib/subculture-event-fetch/types";

/** DB 메타 행 — 지도에 노출되지 않음 */
export const SUBCULTURE_SYNC_META_KEY = "__sync_meta__";

export const SUBCULTURE_MAP_PINS_CACHE_TAG = "subculture-event-pins";

const SYNC_INTERVAL_MS = 60 * 60 * 1000; // 1시간

export type MapEventPin = {
  id: string;
  title: string;
  country: SubcultureEventCountry;
  category: string;
  categoryLabel: string;
  venueName: string | null;
  description: string | null;
  lat: number;
  lng: number;
  startsAt: string;
  endsAt: string | null;
  sourceUrl: string | null;
  source: string;
};

function inferEventCountry(
  lat: number,
  lng: number,
  externalKey?: string | null
): SubcultureEventCountry {
  if (
    externalKey?.startsWith("official-jp-") ||
    externalKey?.startsWith("auto-comiket") ||
    externalKey?.startsWith("auto-wonfes") ||
    externalKey?.startsWith("auto-kyomaf") ||
    externalKey?.startsWith("auto-tgs") ||
    externalKey?.startsWith("auto-comicw") ||
    externalKey?.startsWith("auto-gstar") ||
    externalKey?.startsWith("auto-seoulpopcon")
  ) {
    return "jp";
  }
  return lng >= 132 ? "jp" : "kr";
}

export function mapLinkForEvent(pin: MapEventPin): { label: string; url: string } {
  if (pin.country === "jp") {
    const q = encodeURIComponent(`${pin.venueName ?? pin.title} ${pin.lat},${pin.lng}`);
    return {
      label: "Google 지도",
      url: `https://www.google.com/maps/search/?api=1&query=${q}`,
    };
  }
  return {
    label: "카카오맵",
    url: `https://map.kakao.com/link/map/${pin.lat},${pin.lng}`,
  };
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
      take: limit,
    });

    const pins = mapRowsToPins(rows);
    if (pins.length > 0) return pins;
  } catch {
    /* fall through */
  }

  const { events } = await fetchAllSubcultureEvents();
  return events.slice(0, limit).map((e, i) => ({
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
  }));
}

/** 캐시된 핀 목록 (읽기 전용, 빠름) — sync는 cron 전용 */
export async function getSubcultureMapPins(limit = 48): Promise<MapEventPin[]> {
  return unstable_cache(
    async () => querySubcultureMapPins(limit),
    ["subculture-map-pins-v5", String(limit)],
    { revalidate: 600, tags: [SUBCULTURE_MAP_PINS_CACHE_TAG] }
  )();
}

export async function upsertFetchedSubcultureEvents(
  events: FetchedSubcultureEvent[]
): Promise<number> {
  await Promise.all(
    events.map((e) =>
      db.subcultureEventPin
        .upsert({
          where: { externalKey: e.externalKey },
          create: {
            externalKey: e.externalKey,
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
            source: e.externalKey.startsWith("auto-") ? "auto" : "official",
          },
          update: {
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
            source: e.externalKey.startsWith("auto-") ? "auto" : "official",
          },
        })
        .catch(() => undefined)
    )
  );

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

/** 좌표 없는 행사 — 카카오 로컬로 보강 (cron·수동) */
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
      const coord = await kakaoSearchPlace(q);
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
