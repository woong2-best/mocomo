"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getCachedCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { DEFAULT_BONDEE_ROOM, type BondeeRoomState } from "@/lib/apt/bondee/types";

function parseBondee(raw: unknown): BondeeRoomState {
  if (raw && typeof raw === "object" && "avatar" in (raw as object) && "items" in (raw as object)) {
    return raw as BondeeRoomState;
  }
  return DEFAULT_BONDEE_ROOM;
}

export async function getBondeeRoom(): Promise<BondeeRoomState> {
  const user = await getCachedCurrentUser();
  if (!user) return DEFAULT_BONDEE_ROOM;

  const row = await db.aptProfile.findUnique({ where: { userId: user.id } });
  if (!row?.simulationState) return DEFAULT_BONDEE_ROOM;

  const sim = row.simulationState as Record<string, unknown>;
  return parseBondee(sim.bondee);
}

export async function saveBondeeRoom(state: BondeeRoomState) {
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
