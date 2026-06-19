"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getCachedCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { APT_DEFAULT_FLOOR } from "@/lib/apt/constants";
import { createDefaultFloorPlan } from "@/lib/apt/floor-plan-logic";
import { bondeeFromAptRow } from "@/lib/apt/bondee/bondee-profile";
import { DEFAULT_BONDEE_HOME, type BondeeHomeState } from "@/lib/apt/bondee/types";

export async function getBondeeHome(homeFloor = APT_DEFAULT_FLOOR): Promise<{
  home: BondeeHomeState;
  rooms: import("@/lib/apt/floor-plan-types").AptRoom[];
  homeFloor: number;
}> {
  const user = await getCachedCurrentUser();
  const rooms = createDefaultFloorPlan().rooms;
  if (!user) {
    return { home: DEFAULT_BONDEE_HOME, rooms, homeFloor };
  }

  const row = await db.aptProfile.findUnique({ where: { userId: user.id } });
  const floor = row?.homeFloor ?? homeFloor;
  const { home, rooms: planRooms } = bondeeFromAptRow(row, floor);
  return {
    home,
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
