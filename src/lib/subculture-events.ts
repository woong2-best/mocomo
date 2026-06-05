import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { kakaoSearchPlace } from "@/lib/kakao-local";
import {
  SUBCULTURE_EVENT_SEEDS,
  SUBCULTURE_EVENT_CATEGORY_LABELS,
} from "@/lib/subculture-event-seeds";

/** DB 메타 행 — 지도에 노출되지 않음 */
export const SUBCULTURE_SYNC_META_KEY = "__sync_meta__";

export const SUBCULTURE_MAP_PINS_CACHE_TAG = "subculture-event-pins";

const SYNC_INTERVAL_MS = 60 * 60 * 1000;

export type MapEventPin = {
  id: string;
  title: string;
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

function mapSeedsToPins(limit: number): MapEventPin[] {
  return SUBCULTURE_EVENT_SEEDS.slice(0, limit).map((s, i) => ({
    id: `seed-${s.externalKey}-${i}`,
    title: s.title,
    category: s.category,
    categoryLabel: SUBCULTURE_EVENT_CATEGORY_LABELS[s.category] ?? s.category,
    venueName: s.venueName,
    description: s.description ?? null,
    lat: s.lat,
    lng: s.lng,
    startsAt: s.startsAt,
    endsAt: s.endsAt,
    sourceUrl: s.officialNoticeUrl ?? s.sourceUrl,
    source: "official",
  }));
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
  }[]
): MapEventPin[] {
  return rows
    .filter((r) => r.lat != null && r.lng != null)
    .map((r) => ({
      id: r.id,
      title: r.title,
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

/** DB만 조회 — 동기화·지오코딩 없음 (지도·사이드바용) */
export async function querySubcultureMapPins(limit: number): Promise<MapEventPin[]> {
  try {
    const now = new Date();
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
    return pins.length > 0 ? pins : mapSeedsToPins(limit);
  } catch {
    return mapSeedsToPins(limit);
  }
}

/** 캐시된 핀 목록 (읽기 전용, 빠름) */
export async function getSubcultureMapPins(limit = 32): Promise<MapEventPin[]> {
  return unstable_cache(
    async () => querySubcultureMapPins(limit),
    ["subculture-map-pins-v2", String(limit)],
    { revalidate: 600, tags: [SUBCULTURE_MAP_PINS_CACHE_TAG] }
  )();
}

export async function ensureSubcultureEventSeeds(): Promise<void> {
  await Promise.all(
    SUBCULTURE_EVENT_SEEDS.map((s) =>
      db.subcultureEventPin
        .upsert({
          where: { externalKey: s.externalKey },
          create: {
            externalKey: s.externalKey,
            title: s.title,
            description: s.description,
            category: s.category,
            venueName: s.venueName,
            address: s.address,
            lat: s.lat,
            lng: s.lng,
            startsAt: new Date(s.startsAt),
            endsAt: new Date(s.endsAt),
            sourceUrl: s.officialNoticeUrl ?? s.sourceUrl,
            source: "official",
          },
          update: {
            title: s.title,
            description: s.description,
            category: s.category,
            venueName: s.venueName,
            address: s.address,
            lat: s.lat,
            lng: s.lng,
            startsAt: new Date(s.startsAt),
            endsAt: new Date(s.endsAt),
            sourceUrl: s.officialNoticeUrl ?? s.sourceUrl,
            source: "official",
          },
        })
        .catch(() => undefined)
    )
  );

  try {
    const validKeys = [
      ...SUBCULTURE_EVENT_SEEDS.map((s) => s.externalKey),
      SUBCULTURE_SYNC_META_KEY,
    ];
    await db.subcultureEventPin.deleteMany({
      where: {
        source: { in: ["seed", "official"] },
        externalKey: { notIn: validKeys },
      },
    });
  } catch {
    /* ignore */
  }
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

/** 시드 반영 + 지오코딩 — cron 전용 (페이지 로드에서 호출하지 않음) */
export async function syncSubcultureEventsIfDue(options?: {
  force?: boolean;
  geocodeMax?: number;
}): Promise<{ synced: boolean; geocoded: number }> {
  const force = options?.force ?? false;
  const geocodeMax = options?.geocodeMax ?? 3;

  if (!force && !(await isSubcultureSyncDue())) {
    return { synced: false, geocoded: 0 };
  }

  await ensureSubcultureEventSeeds();
  const geocoded = await geocodePendingSubcultureEvents(geocodeMax);
  await touchSubcultureSyncMeta();

  try {
    const { revalidateTag } = await import("next/cache");
    revalidateTag(SUBCULTURE_MAP_PINS_CACHE_TAG);
  } catch {
    /* ignore */
  }

  return { synced: true, geocoded };
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
