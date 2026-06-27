"use server";

import { revalidatePath } from "next/cache";
import { getCachedCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { mergeGameState } from "@/lib/apt/game/defaults";
import {
  ENERGY_COST_PLACE,
  ENERGY_REWARD_MISSION,
  ENERGY_REWARD_AD,
  canSpendEnergy,
  regenEnergy,
  spendEnergy,
} from "@/lib/apt/game/energy";
import {
  canUseSticker,
  getStickerGoldPrice,
  isStarterOwned,
} from "@/lib/apt/game/shop";
import type { AptGameState, AptMissionDef } from "@/lib/apt/game/types";
import { resolveAptHomeOwnerId } from "@/actions/apt-cohabitation";

export type AptGameActionResult =
  | { ok: true; game: AptGameState }
  | { error: string }
  | { ok: true; game: AptGameState; alreadyOwned?: true; price?: number; reward?: { gold: number; gems: number } };

function tickEnergy(game: AptGameState): AptGameState {
  const r = regenEnergy(game.energy, game.maxEnergy, game.energyUpdatedAt);
  return { ...game, energy: r.energy, energyUpdatedAt: r.lastTick };
}

async function loadRawGame(userId: string): Promise<AptGameState> {
  const ownerId = await resolveAptHomeOwnerId(userId);
  const row = await db.aptProfile.findUnique({
    where: { userId: ownerId },
    select: { simulationState: true },
  });
  const sim = row?.simulationState as Record<string, unknown> | null;
  return tickEnergy(mergeGameState(sim?.game));
}

async function saveRawGame(userId: string, game: AptGameState) {
  const ownerId = await resolveAptHomeOwnerId(userId);
  const row = await db.aptProfile.findUnique({
    where: { userId: ownerId },
    select: { simulationState: true },
  });
  const sim = (row?.simulationState as Record<string, unknown>) ?? {};
  await db.aptProfile.upsert({
    where: { userId: ownerId },
    create: {
      userId: ownerId,
      simulationState: { ...sim, game },
      moveInCompletedAt: new Date(),
    },
    update: {
      simulationState: { ...sim, game },
    },
  });
  revalidatePath("/apt");
}

export async function getAptGameState(): Promise<AptGameState | null> {
  const user = await getCachedCurrentUser();
  if (!user) return null;
  return loadRawGame(user.id);
}

export async function purchaseAptSticker(typeId: string) {
  const user = await getCachedCurrentUser();
  if (!user) return { error: "로그인이 필요합니다." as const };

  if (isStarterOwned(typeId)) return { ok: true as const, alreadyOwned: true as const };

  const game = await loadRawGame(user.id);
  if (canUseSticker(typeId, game.ownedStickers)) {
    return { ok: true as const, alreadyOwned: true as const, game };
  }

  const price = getStickerGoldPrice(typeId);
  if (game.gold < price) {
    return { error: `골드가 부족합니다. (${price.toLocaleString()}G 필요)` as const };
  }

  game.gold -= price;
  game.ownedStickers = [...game.ownedStickers, typeId];
  game.missions = bumpMission(game.missions, "story-buy-item", 1);

  await saveRawGame(user.id, game);
  return { ok: true as const, game, price };
}

export async function claimAptMission(missionId: string) {
  const user = await getCachedCurrentUser();
  if (!user) return { error: "로그인이 필요합니다." as const };

  const game = await loadRawGame(user.id);
  const mission = game.missions.find((m) => m.id === missionId);
  if (!mission) return { error: "미션을 찾을 수 없습니다." as const };
  if (!mission.completed) return { error: "아직 미션을 완료하지 않았습니다." as const };
  if (mission.claimed) return { error: "이미 보상을 받았습니다." as const };

  mission.claimed = true;
  game.gold += mission.goldReward;
  game.gems += mission.gemReward;
  game.energy = Math.min(game.maxEnergy, game.energy + ENERGY_REWARD_MISSION);
  game.energyUpdatedAt = new Date().toISOString();

  await saveRawGame(user.id, game);
  return {
    ok: true as const,
    game,
    reward: { gold: mission.goldReward, gems: mission.gemReward },
  };
}

export async function boostAptEnergy() {
  const user = await getCachedCurrentUser();
  if (!user) return { error: "로그인이 필요합니다." as const };

  const game = await loadRawGame(user.id);
  game.energy = Math.min(game.maxEnergy, game.energy + ENERGY_REWARD_AD);
  game.energyUpdatedAt = new Date().toISOString();
  await saveRawGame(user.id, game);
  return { ok: true as const, game };
}

export async function reportAptGameEvent(
  event:
    | { type: "place_sticker"; typeId: string; roomId: string }
    | { type: "visit_friend" }
    | { type: "furniture_count"; count: number; roomIds: string[] }
): Promise<AptGameState | { error: string } | null> {
  const user = await getCachedCurrentUser();
  if (!user) return null;

  const game = await loadRawGame(user.id);
  let changed = false;

  if (event.type === "place_sticker") {
    if (!canSpendEnergy(game.energy, ENERGY_COST_PLACE)) {
      return { error: `에너지가 부족해요. (⚡${ENERGY_COST_PLACE} 필요)` };
    }
    game.energy = spendEnergy(game.energy, ENERGY_COST_PLACE);
    game.energyUpdatedAt = new Date().toISOString();

    if (!game.decoratedRooms.includes(event.roomId)) {
      game.decoratedRooms = [...game.decoratedRooms, event.roomId];
    }

    for (const m of game.missions) {
      if (m.completed) continue;
      if (m.placeSticker === event.typeId) {
        m.progress = Math.min(m.target, m.progress + 1);
        if (m.progress >= m.target) m.completed = true;
        changed = true;
      }
      if (m.upgradeFurniture && m.id === "story-first-room") {
        m.progress = Math.min(m.target, m.progress + 1);
        if (m.progress >= m.target) m.completed = true;
        changed = true;
      }
    }

    const multi = game.missions.find((m) => m.id === "story-multi-room");
    if (multi && !multi.completed) {
      multi.progress = Math.min(multi.target, game.decoratedRooms.length);
      if (multi.progress >= multi.target) multi.completed = true;
      changed = true;
    }
    changed = true;
  }

  if (event.type === "visit_friend") {
    game.missions = bumpMission(game.missions, "daily-visit-friend", 1);
    changed = true;
  }

  if (event.type === "furniture_count") {
    const multi = game.missions.find((m) => m.id === "story-multi-room");
    if (multi && !multi.completed) {
      multi.progress = Math.min(multi.target, event.roomIds.length);
      if (multi.progress >= multi.target) multi.completed = true;
      changed = true;
    }
  }

  if (changed) await saveRawGame(user.id, game);
  return changed ? game : null;
}

function bumpMission(missions: AptMissionDef[], id: string, delta: number) {
  return missions.map((m) => {
    if (m.id !== id || m.completed) return m;
    const progress = Math.min(m.target, m.progress + delta);
    return { ...m, progress, completed: progress >= m.target };
  });
}
