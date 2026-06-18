"use server";

import { revalidatePath } from "next/cache";
import { getCachedCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { APT_DEFAULT_FLOOR } from "@/lib/apt/constants";
import { clampFloor, emptyFloorPlans, getRoomsForFloor } from "@/lib/apt/floor-plan-store";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import {
  defaultFurnitureForPlan,
  defaultResidents,
  type FurnitureItem,
  type ResidentAgent,
  type SimulationSnapshot,
} from "@/lib/apt/simulation/types";

export type AptProfileDto = {
  homeFloor: number;
  moveInCompleted: boolean;
  floorPlans: Record<number, AptRoom[]>;
  furniture: FurnitureItem[];
  residents: ResidentAgent[];
  simulation: Partial<SimulationSnapshot>;
};

function defaultPlans(): Record<number, AptRoom[]> {
  return emptyFloorPlans();
}

function parseJson<T>(raw: unknown, fallback: T): T {
  if (raw == null) return fallback;
  return raw as T;
}

export async function getAptProfile(): Promise<AptProfileDto | null> {
  const user = await getCachedCurrentUser();
  if (!user) return null;

  const plans = defaultPlans();
  const rooms = getRoomsForFloor(plans, APT_DEFAULT_FLOOR);
  const fallback: AptProfileDto = {
    homeFloor: APT_DEFAULT_FLOOR,
    moveInCompleted: false,
    floorPlans: plans,
    furniture: defaultFurnitureForPlan(rooms),
    residents: defaultResidents({
      userId: user.id,
      displayName: user.name ?? user.username,
    }),
    simulation: {},
  };

  try {
    const row = await db.aptProfile.findUnique({ where: { userId: user.id } });
    if (!row) return fallback;

  const floorPlans = parseJson<Record<number, AptRoom[]>>(row.floorPlans, defaultPlans());
  const homeFloor = row.homeFloor ?? APT_DEFAULT_FLOOR;
  const rooms = getRoomsForFloor(floorPlans, homeFloor);

  return {
    homeFloor,
    moveInCompleted: !!row.moveInCompletedAt,
    floorPlans,
    furniture: parseJson(row.furniture, defaultFurnitureForPlan(rooms)),
    residents: parseJson(
      row.residents,
      defaultResidents({ userId: user.id, displayName: user.name ?? user.username })
    ),
    simulation: parseJson(row.simulationState, {}),
  };
  } catch {
    return fallback;
  }
}

export async function completeAptMoveIn(homeFloor: number) {
  const user = await getCachedCurrentUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const floor = clampFloor(homeFloor);
  const plans = defaultPlans();
  const rooms = getRoomsForFloor(plans, floor);
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
        homeFloor: floor,
        moveInCompletedAt: new Date(),
        floorPlans: plans,
        furniture,
        residents,
        simulationState: {},
      },
      update: {
        homeFloor: floor,
        moveInCompletedAt: new Date(),
        floorPlans: plans,
        furniture,
        residents,
      },
    });

    revalidatePath("/apt");
    revalidatePath("/apt/move-in");
    return { ok: true as const };
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
