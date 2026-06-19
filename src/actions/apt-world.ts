"use server";

import { getCachedCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { emptyHouseBuild, seedFromCoords } from "@/lib/apt/house/build-types";
import type { HouseBuildState } from "@/lib/apt/house/build-types";
import type { HousingType } from "@/lib/apt/housing-types";
import { haversineKm } from "@/lib/apt/world/geo-math";

export type PublicHomeDto = {
  userId: string;
  username: string;
  displayName: string;
  image: string | null;
  housingType: HousingType;
  countryCode: string;
  regionLabel: string | null;
  latitude: number;
  longitude: number;
  houseBuild: HouseBuildState;
  distanceKm: number | null;
};

function parseBuild(raw: unknown, lat: number, lng: number): HouseBuildState {
  if (raw && typeof raw === "object" && "pieces" in (raw as object)) return raw as HouseBuildState;
  return emptyHouseBuild(undefined, seedFromCoords(lat, lng));
}

export async function listPublicHomes(lat?: number, lng?: number, limit = 40): Promise<PublicHomeDto[]> {
  const user = await getCachedCurrentUser();
  const rows = await db.aptProfile.findMany({
    where: {
      moveInCompletedAt: { not: null },
      homePublic: true,
      housingType: "house",
      latitude: { not: null },
      longitude: { not: null },
      ...(user ? { userId: { not: user.id } } : {}),
    },
    include: {
      user: { select: { id: true, username: true, name: true, image: true } },
    },
    take: 120,
    orderBy: { updatedAt: "desc" },
  });

  const mapped = rows.map((row) => {
    const plat = row.latitude!;
    const plng = row.longitude!;
    const dist =
      lat != null && lng != null ? haversineKm(lat, lng, plat, plng) : null;
    return {
      userId: row.user.id,
      username: row.user.username,
      displayName: row.user.name ?? row.user.username,
      image: row.user.image,
      housingType: "house" as HousingType,
      countryCode: row.countryCode,
      regionLabel: row.regionLabel,
      latitude: plat,
      longitude: plng,
      houseBuild: parseBuild(row.houseBuild, plat, plng),
      distanceKm: dist,
    };
  });

  if (lat != null && lng != null) {
    mapped.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  }

  return mapped.slice(0, limit);
}

export async function getPublicHome(userId: string): Promise<PublicHomeDto | null> {
  const row = await db.aptProfile.findFirst({
    where: {
      userId,
      moveInCompletedAt: { not: null },
      homePublic: true,
    },
    include: {
      user: { select: { id: true, username: true, name: true, image: true } },
    },
  });
  if (!row || row.latitude == null || row.longitude == null) return null;

  return {
    userId: row.user.id,
    username: row.user.username,
    displayName: row.user.name ?? row.user.username,
    image: row.user.image,
    housingType: row.housingType === "house" ? "house" : "apartment",
    countryCode: row.countryCode,
    regionLabel: row.regionLabel,
    latitude: row.latitude,
    longitude: row.longitude,
    houseBuild: parseBuild(row.houseBuild, row.latitude, row.longitude),
    distanceKm: null,
  };
}

export async function setHomePublic(publicVisible: boolean) {
  const user = await getCachedCurrentUser();
  if (!user) return { error: "로그인이 필요합니다." };

  await db.aptProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, homePublic: publicVisible },
    update: { homePublic: publicVisible },
  });
  return { ok: true as const };
}
