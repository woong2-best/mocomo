"use server";

import { revalidatePath } from "next/cache";
import { revalidateAptHub } from "@/lib/apt/revalidate-hub";
import { Prisma } from "@prisma/client";
import { getCachedCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { APT_DEFAULT_FLOOR } from "@/lib/apt/constants";
import { createDefaultFloorPlan } from "@/lib/apt/floor-plan-logic";
import { bondeeFromAptRow } from "@/lib/apt/bondee/bondee-profile";
import { DEFAULT_BONDEE_HOME, type BondeeHomeState } from "@/lib/apt/bondee/types";
import { mergeOwnedBondeeState, resolveAptHomeOwnerId } from "@/actions/apt-cohabitation";

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

  const ownerId = await resolveAptHomeOwnerId(user.id);
  const row = await db.aptProfile.findUnique({ where: { userId: ownerId } });
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

  const ownerId = await resolveAptHomeOwnerId(user.id);
  const existing = await db.aptProfile.findUnique({ where: { userId: ownerId } });
  const sim =
    existing?.simulationState && typeof existing.simulationState === "object"
      ? { ...(existing.simulationState as Record<string, unknown>) }
      : {};

  const existingBondee =
    sim.bondee && typeof sim.bondee === "object" && "items" in (sim.bondee as object)
      ? (sim.bondee as BondeeHomeState)
      : DEFAULT_BONDEE_HOME;
  sim.bondee = await mergeOwnedBondeeState({
    existing: existingBondee,
    incoming: state,
    userId: user.id,
    hostId: ownerId,
  });
  const jsonSim = sim as Prisma.InputJsonValue;

  await db.aptProfile.upsert({
    where: { userId: ownerId },
    create: { userId: ownerId, simulationState: jsonSim, moveInCompletedAt: new Date() },
    update: { simulationState: jsonSim },
  });

  revalidateAptHub();
  return { ok: true as const };
}

export const saveBondeeRoom = saveBondeeHome;
