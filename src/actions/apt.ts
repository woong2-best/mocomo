"use server";

import { revalidatePath } from "next/cache";
import { getCachedCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { APT_DEFAULT_FLOOR } from "@/lib/apt/constants";
import { clampFloor, emptyFloorPlans, getRoomsForFloor } from "@/lib/apt/floor-plan-store";
import type { HouseBuildState } from "@/lib/apt/house/build-types";
import { emptyHouseBuild, seedFromCoords } from "@/lib/apt/house/build-types";
import type { HousingLocation, HousingType } from "@/lib/apt/housing-types";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { DEFAULT_BONDEE_ROOM, type BondeeRoomState } from "@/lib/apt/bondee/types";
import {
  defaultFurnitureForPlan,
  defaultResidents,
  type FurnitureItem,
  type ResidentAgent,
  type SimulationSnapshot,
} from "@/lib/apt/simulation/types";

export type AptProfileDto = {
  housingType: HousingType;
  countryCode: string;
  latitude: number | null;
  longitude: number | null;
  regionLabel: string | null;
  homeFloor: number;
  moveInCompleted: boolean;
  /** 회원가입 시 층을 미리 선택해 AptProfile이 생성된 경우 */
  floorPresetFromSignup: boolean;
  homePublic: boolean;
  floorPlans: Record<number, AptRoom[]>;
  furniture: FurnitureItem[];
  residents: ResidentAgent[];
  simulation: Partial<SimulationSnapshot>;
  houseBuild: HouseBuildState;
};

export type MoveInPayload = {
  housingType: HousingType;
  homeFloor?: number;
  countryCode: string;
  latitude: number;
  longitude: number;
  regionLabel: string;
};

function defaultPlans(): Record<number, AptRoom[]> {
  return emptyFloorPlans();
}

function parseJson<T>(raw: unknown, fallback: T): T {
  if (raw == null) return fallback;
  return raw as T;
}

function rowToDto(
  row: {
    housingType: string;
    countryCode: string;
    latitude: number | null;
    longitude: number | null;
    regionLabel: string | null;
    homeFloor: number;
    moveInCompletedAt: Date | null;
    homePublic: boolean;
    floorPlans: unknown;
    furniture: unknown;
    residents: unknown;
    simulationState: unknown;
    houseBuild: unknown;
  },
  user: { id: string; name: string | null; username: string }
): AptProfileDto {
  const floorPlans = parseJson<Record<number, AptRoom[]>>(row.floorPlans, defaultPlans());
  const homeFloor = row.homeFloor ?? APT_DEFAULT_FLOOR;
  const rooms = getRoomsForFloor(floorPlans, homeFloor);

  return {
    housingType: (row.housingType === "house" ? "house" : "apartment") as HousingType,
    countryCode: row.countryCode ?? "KR",
    latitude: row.latitude,
    longitude: row.longitude,
    regionLabel: row.regionLabel,
    homeFloor,
    moveInCompleted: !!row.moveInCompletedAt,
    floorPresetFromSignup: false,
    homePublic: row.homePublic ?? true,
    floorPlans,
    furniture: parseJson(row.furniture, defaultFurnitureForPlan(rooms)),
    residents: parseJson(
      row.residents,
      defaultResidents({ userId: user.id, displayName: user.name ?? user.username })
    ),
    simulation: parseJson(row.simulationState, {}),
    houseBuild: parseJson(row.houseBuild, emptyHouseBuild()),
  };
}

export async function getAptProfile(): Promise<AptProfileDto | null> {
  const user = await getCachedCurrentUser();
  if (!user) return null;

  const plans = defaultPlans();
  const rooms = getRoomsForFloor(plans, APT_DEFAULT_FLOOR);
  const fallback: AptProfileDto = {
    housingType: "apartment",
    countryCode: user.countryCode ?? "KR",
    latitude: null,
    longitude: null,
    regionLabel: null,
    homeFloor: APT_DEFAULT_FLOOR,
    moveInCompleted: false,
    floorPresetFromSignup: false,
    homePublic: true,
    floorPlans: plans,
    furniture: defaultFurnitureForPlan(rooms),
    residents: defaultResidents({
      userId: user.id,
      displayName: user.name ?? user.username,
    }),
    simulation: {},
    houseBuild: emptyHouseBuild(seedFromCoords(user.countryCode === "KR" ? 37.5 : 0, 127)),
  };

  try {
    const row = await db.aptProfile.findUnique({ where: { userId: user.id } });
    if (!row) return fallback;
    const dto = rowToDto(row, user);
    return {
      ...dto,
      floorPresetFromSignup: !row.moveInCompletedAt,
    };
  } catch {
    return fallback;
  }
}

export async function completeAptMoveIn(payload: MoveInPayload) {
  const user = await getCachedCurrentUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const housingType = "apartment";
  const floor = housingType === "apartment" ? clampFloor(payload.homeFloor ?? APT_DEFAULT_FLOOR) : 0;

  if (await isFloorOccupied(payload.countryCode, floor, user.id)) {
    return { error: `${floor}층은 이미 입주 중입니다. 다른 층을 선택해 주세요.` };
  }

  const plans = defaultPlans();
  const rooms = getRoomsForFloor(plans, floor || APT_DEFAULT_FLOOR);
  const furniture = defaultFurnitureForPlan(rooms);
  const residents = defaultResidents({
    userId: user.id,
    displayName: user.name ?? user.username,
  });

  try {
    await db.aptProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        housingType,
        countryCode: payload.countryCode.toUpperCase(),
        latitude: payload.latitude,
        longitude: payload.longitude,
        regionLabel: payload.regionLabel,
        homeFloor: floor || APT_DEFAULT_FLOOR,
        moveInCompletedAt: new Date(),
        floorPlans: plans,
        furniture,
        residents,
        simulationState: {},
        houseBuild: emptyHouseBuild(seedFromCoords(payload.latitude, payload.longitude)),
      },
      update: {
        housingType,
        countryCode: payload.countryCode.toUpperCase(),
        latitude: payload.latitude,
        longitude: payload.longitude,
        regionLabel: payload.regionLabel,
        homeFloor: floor || APT_DEFAULT_FLOOR,
        moveInCompletedAt: new Date(),
        floorPlans: plans,
        furniture,
        residents,
      },
    });

    revalidatePath("/apt");
    revalidatePath("/apt/move-in");
    revalidatePath("/apt/house");
    return { ok: true as const, housingType };
  } catch (e) {
    console.error("[completeAptMoveIn]", e);
    return { error: "입주 저장에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }
}

export async function saveAptFloorPlan(floor: number, rooms: AptRoom[]) {
  const user = await getCachedCurrentUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const existing = await db.aptProfile.findUnique({ where: { userId: user.id } });
  const plans = parseJson<Record<number, AptRoom[]>>(existing?.floorPlans, defaultPlans());
  plans[floor] = rooms;

  await db.aptProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      homeFloor: floor,
      floorPlans: plans,
      furniture: defaultFurnitureForPlan(rooms),
      residents: defaultResidents({ userId: user.id, displayName: user.name ?? user.username }),
    },
    update: { floorPlans: plans },
  });

  return { ok: true as const };
}

export async function saveAptSimulationState(payload: {
  furniture: FurnitureItem[];
  residents: ResidentAgent[];
  homeFloor: number;
}) {
  const user = await getCachedCurrentUser();
  if (!user) return;

  await db.aptProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      homeFloor: payload.homeFloor,
      furniture: payload.furniture,
      residents: payload.residents,
      moveInCompletedAt: new Date(),
    },
    update: {
      furniture: payload.furniture,
      residents: payload.residents,
      homeFloor: payload.homeFloor,
    },
  });
}

export async function placeAptTv() {
  const user = await getCachedCurrentUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const profile = await getAptProfile();
  if (!profile) return { error: "프로필 없음" };

  const floor = profile.homeFloor;
  const rooms = getRoomsForFloor(profile.floorPlans, floor);
  const living = rooms.find((r) => r.type === "living");
  if (!living) return { error: "거실이 없습니다." };

  const furniture: FurnitureItem[] = [
    ...profile.furniture.filter((f) => f.type !== "tv"),
    { id: `tv-${Date.now()}`, type: "tv", roomId: living.id, x: 0.3, z: -0.15, active: false },
  ];

  await saveAptSimulationState({
    furniture,
    residents: profile.residents,
    homeFloor: floor,
  });

  revalidatePath("/apt");
  return { ok: true as const, furniture };
}

export async function saveAptHouseBuild(state: HouseBuildState) {
  const user = await getCachedCurrentUser();
  if (!user) return { error: "로그인이 필요합니다." };

  try {
    await db.aptProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        housingType: "house",
        moveInCompletedAt: new Date(),
        houseBuild: state,
      },
      update: { houseBuild: state },
    });
    revalidatePath("/apt/house");
    return { ok: true as const };
  } catch (e) {
    console.error("[saveAptHouseBuild]", e);
    return { error: "건설 저장에 실패했습니다." };
  }
}

export type CountryAptPreview = {
  userId: string;
  username: string;
  displayName: string;
  homeFloor: number;
  floorPlans: Record<number, AptRoom[]>;
  bondeeRoom: BondeeRoomState;
};

export type FloorOccupant = {
  userId: string;
  username: string;
  displayName: string;
  homeFloor: number;
  /** true = 현관문 열림 → 다른 유저가 집 구경 가능 */
  doorOpen: boolean;
};

/** 국가별 층 점유 현황 (입주 완료 유저) */
export async function getCountryFloorOccupants(countryCode: string): Promise<FloorOccupant[]> {
  const rows = await db.aptProfile.findMany({
    where: {
      moveInCompletedAt: { not: null },
      housingType: "apartment",
      countryCode: countryCode.toUpperCase(),
    },
    include: {
      user: { select: { id: true, name: true, username: true } },
    },
  });

  return rows.map((row) => ({
    userId: row.user.id,
    username: row.user.username,
    displayName: row.user.name ?? row.user.username,
    homeFloor: row.homeFloor ?? APT_DEFAULT_FLOOR,
    doorOpen: row.homePublic ?? true,
  }));
}

export async function getOccupiedFloorsForCountry(countryCode: string): Promise<number[]> {
  const occupants = await getCountryFloorOccupants(countryCode);
  return occupants.map((o) => o.homeFloor);
}

async function isFloorOccupied(countryCode: string, floor: number, excludeUserId?: string) {
  const existing = await db.aptProfile.findFirst({
    where: {
      moveInCompletedAt: { not: null },
      housingType: "apartment",
      countryCode: countryCode.toUpperCase(),
      homeFloor: floor,
      ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
    },
    select: { userId: true },
  });
  return !!existing;
}

/** 회원가입·입주 시 층 가용 여부 */
export async function checkFloorAvailableForSignup(countryCode: string, floor: number) {
  const clamped = clampFloor(floor);
  if (await isFloorOccupied(countryCode, clamped)) {
    return { ok: false as const, error: `${clamped}층은 이미 입주 중입니다. 다른 층을 선택해 주세요.` };
  }
  return { ok: true as const, floor: clamped };
}

export async function listCountryApartments(countryCode: string): Promise<CountryAptPreview[]> {
  const user = await getCachedCurrentUser();
  const rows = await db.aptProfile.findMany({
    where: {
      moveInCompletedAt: { not: null },
      housingType: "apartment",
      countryCode: countryCode.toUpperCase(),
      homePublic: true,
      ...(user ? { userId: { not: user.id } } : {}),
    },
    include: {
      user: { select: { id: true, name: true, username: true } },
    },
    take: 60,
    orderBy: { updatedAt: "desc" },
  });

  return rows.map((row) => {
    const sim =
      row.simulationState && typeof row.simulationState === "object"
        ? (row.simulationState as Record<string, unknown>)
        : {};
    const bondee =
      sim.bondee && typeof sim.bondee === "object" && "items" in (sim.bondee as object)
        ? (sim.bondee as BondeeRoomState)
        : DEFAULT_BONDEE_ROOM;

    return {
      userId: row.user.id,
      username: row.user.username,
      displayName: row.user.name ?? row.user.username,
      homeFloor: row.homeFloor ?? APT_DEFAULT_FLOOR,
      floorPlans: parseJson<Record<number, AptRoom[]>>(row.floorPlans, defaultPlans()),
      bondeeRoom: bondee,
    };
  });
}

export type { HousingLocation };
