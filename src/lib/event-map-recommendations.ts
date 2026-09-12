import { db } from "@/lib/db";
import type { MapEventPin } from "@/lib/subculture-event-pins";
import { SUBCULTURE_EVENT_CATEGORY_LABELS } from "@/lib/subculture-event-types";
import { inferEventCountryFromCoords } from "@/lib/subculture-event-countries";

export type EventMapUserRecommendationRow = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  lat: number;
  lng: number;
  createdAt: Date;
  user: { username: string; name: string | null };
};

export function recommendationRowToMapPin(row: EventMapUserRecommendationRow): MapEventPin {
  return {
    id: `user-rec-${row.id}`,
    title: row.title,
    country: inferEventCountryFromCoords(row.lat, row.lng),
    category: "user_recommendation",
    categoryLabel: SUBCULTURE_EVENT_CATEGORY_LABELS.user_recommendation ?? "추천",
    venueName: row.description?.trim() || null,
    description: `${row.user.name?.trim() || row.user.username}님 추천`,
    lat: row.lat,
    lng: row.lng,
    startsAt: row.createdAt.toISOString(),
    endsAt: null,
    sourceUrl: null,
    source: "user",
    phase: "permanent",
  };
}

/** Map pin id (`user-rec-{id}`) or raw DB id → cuid */
export function normalizeEventMapRecommendationId(id: string): string {
  return id.startsWith("user-rec-") ? id.slice("user-rec-".length) : id;
}

export async function getEventMapUserRecommendations(limit = 200): Promise<MapEventPin[]> {
  const rows = await db.eventMapUserRecommendation.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      userId: true,
      title: true,
      description: true,
      lat: true,
      lng: true,
      createdAt: true,
      user: { select: { username: true, name: true } },
    },
  });
  return rows.map(recommendationRowToMapPin);
}
