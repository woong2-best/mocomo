"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getCachedCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { APT_DEFAULT_FLOOR } from "@/lib/apt/constants";
import { createDefaultFloorPlan } from "@/lib/apt/floor-plan-logic";
import { getRoomsForFloor } from "@/lib/apt/floor-plan-store";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { defaultItemsForRooms, migrateItems } from "@/lib/apt/bondee/home-floor-meshes";
import { DEFAULT_BONDEE_HOME, type BondeeHomeState } from "@/lib/apt/bondee/types";

function parseJson<T>(raw: unknown, fallback: T): T {
  if (raw == null) return fallback;
  return raw as T;
}

function defaultPlans(): Record<number, AptRoom[]> {
  const d = createDefaultFloorPlan().rooms;
  return { [APT_DEFAULT_FLOOR]: d };
}

function parseBondee(raw: unknown, rooms: AptRoom[]): BondeeHomeState {
  if (raw && typeof raw === "object" && "avatar" in (raw as object)) {
    const o = raw as BondeeHomeState;
    const items = o.items?.length ? migrateItems(o.items, rooms) : defaultItemsForRooms(rooms);
    return {
      ...DEFAULT_BONDEE_HOME,
      ...o,
      items,
      activeRoomId: o.activeRoomId ?? rooms.find((r) => r.type === "living")?.id ?? rooms[0]?.id,
    };
  }
  return {
    ...DEFAULT_BONDEE_HOME,
    items: defaultItemsForRooms(rooms),
    activeRoomId: rooms.find((r) => r.type === "living")?.id ?? rooms[0]?.id,
  };
}

export async function getBondeeHome(homeFloor = APT_DEFAULT_FLOOR): Promise<{
  home: BondeeHomeState;
  rooms: AptRoom[];
  homeFloor: number;
}> {
  const user = await getCachedCurrentUser();
  const rooms = createDefaultFloorPlan().rooms;
  if (!user) {
    return { home: parseBondee(null, rooms), rooms, homeFloor };
  }

  const row = await db.aptProfile.findUnique({ where: { userId: user.id } });
  const floor = row?.homeFloor ?? homeFloor;
  const plans = parseJson<Record<number, AptRoom[]>>(row?.floorPlans, defaultPlans());
  const planRooms = getRoomsForFloor(plans, floor);
  const sim = (row?.simulationState ?? {}) as Record<string, unknown>;
  return {
    home: parseBondee(sim.bondee, planRooms),
    rooms: planRooms,
    homeFloor: floor,
  };
}

/** @deprecated alias */
export const getBondeeRoom = async () => {
  const { home } = await getBondeeHome();
  return home;
};

export async function saveBondeeHome(state: BondeeHomeState) {
  const user = await getCachedCurrentUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const existing = await db.aptProfile.findUnique({ where: { userId: user.id } });
  const sim =
    existing?.simulationState && typeof existing.simulationState === "object"
      ? { ...(existing.simulationState as Record<string, unknown>) }
      : {};

  sim.bondee = state;
  const jsonSim = sim as Prisma.InputJsonValue;

  await db.aptProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, simulationState: jsonSim, moveInCompletedAt: new Date() },
    update: { simulationState: jsonSim },
  });

  revalidatePath("/apt");
  return { ok: true as const };
}

export const saveBondeeRoom = saveBondeeHome;
