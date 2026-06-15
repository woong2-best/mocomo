import type { PrismaClient } from "@prisma/client";
import { mmrDelta, tierFromMmr } from "../../src/lib/minigames/mmr";
import {
  checkParkingAchievements,
  parseParkingSummaries,
  upsertParkingRating,
} from "../../src/lib/minigames/parking-rush-postgame";
import type { MinigameRoomInternal } from "./types";
import { MINIGAME_CPU_USER_ID } from "../../src/lib/minigames/minigame-cpu";
import { isCpuSoloRoom } from "./cpu-solo";

async function getActiveSeasonId(prisma: PrismaClient): Promise<string | null> {
  const season = await prisma.minigameSeason.findFirst({
    where: { active: true, startsAt: { lte: new Date() }, endsAt: { gte: new Date() } },
    orderBy: { startsAt: "desc" },
  });
  return season?.id ?? null;
}

async function unlockAchievement(prisma: PrismaClient, userId: string, achievementId: string) {
  try {
    await prisma.minigameUserAchievement.upsert({
      where: { userId_achievementId: { userId, achievementId } },
      create: { userId, achievementId },
      update: {},
    });
  } catch {
    /* ignore dup */
  }
}

async function checkAchievements(prisma: PrismaClient, userId: string, gameId: string, won: boolean) {
  const rating = await prisma.minigameRating.findUnique({
    where: { userId_gameId: { userId, gameId } },
  });
  if (!rating) return;
  if (won && rating.wins === 1) await unlockAchievement(prisma, userId, "first_win");
  if (rating.wins >= 10) await unlockAchievement(prisma, userId, "wins_10");
  if (rating.wins >= 100) await unlockAchievement(prisma, userId, "wins_100");
  if (rating.winStreak >= 5) await unlockAchievement(prisma, userId, "streak_5");
  if (rating.winStreak >= 10) await unlockAchievement(prisma, userId, "streak_10");
  if (rating.mmr >= 2000) await unlockAchievement(prisma, userId, "master_tier");
  const distinctGames = await prisma.minigameRating.count({ where: { userId, wins: { gt: 0 } } });
  if (distinctGames >= 5) await unlockAchievement(prisma, userId, "all_rounds");
}

/** 게임 종료 시 전적·MMR 저장 — matchId 반환 */
export async function persistMinigameResult(
  prisma: PrismaClient,
  room: MinigameRoomInternal
): Promise<string | null> {
  try {
    const playerIds = [...room.players.keys()];
    const playerNames = Object.fromEntries(
      [...room.players.values()].map((p) => [p.userId, p.username])
    );
    const seasonId = await getActiveSeasonId(prisma);
    const startedAt = room.gameStartedAt ? new Date(room.gameStartedAt) : new Date();
    const match = await prisma.minigameMatch.create({
      data: {
        gameId: room.gameId,
        roomId: room.id,
        winnerId: room.winnerId,
        result: room.resultMessage,
        playerIds,
        playerNames,
        moves: room.moveHistory as object[],
        initialState: room.initialGameState as object | undefined,
        seasonId,
        startedAt,
        endedAt: new Date(),
      },
    });

    const isDraw = !room.winnerId && room.resultMessage?.includes("무");
    const isCpuSolo = isCpuSoloRoom(room);
    const ratedPlayerIds = playerIds.filter((id) => id !== MINIGAME_CPU_USER_ID);

    if (ratedPlayerIds.length === 2 && !isCpuSolo) {
      const [a, b] = ratedPlayerIds;
      for (const uid of ratedPlayerIds) {
        await prisma.minigameRating.upsert({
          where: { userId_gameId: { userId: uid, gameId: room.gameId } },
          create: {
            userId: uid,
            gameId: room.gameId,
            mmr: 1000,
            tier: "BRONZE",
            wins: 0,
            losses: 0,
            draws: 0,
            winStreak: 0,
          },
          update: {},
        });
      }

      const ra = await prisma.minigameRating.findUnique({
        where: { userId_gameId: { userId: a!, gameId: room.gameId } },
      });
      const rb = await prisma.minigameRating.findUnique({
        where: { userId_gameId: { userId: b!, gameId: room.gameId } },
      });
      if (ra && rb) {
        const delta =
          room.winnerId === a
            ? mmrDelta(ra.mmr, rb.mmr, isDraw)
            : room.winnerId === b
              ? mmrDelta(rb.mmr, ra.mmr, isDraw)
              : mmrDelta(ra.mmr, rb.mmr, true);

        const apply = async (userId: string, cur: typeof ra, mmrChange: number, won: boolean, lost: boolean) => {
          const nextMmr = Math.max(100, Math.round(cur.mmr + mmrChange));
          const winStreak = won ? cur.winStreak + 1 : 0;
          await prisma.minigameRating.update({
            where: { userId_gameId: { userId, gameId: room.gameId } },
            data: {
              mmr: nextMmr,
              tier: tierFromMmr(nextMmr),
              wins: won ? { increment: 1 } : undefined,
              losses: lost ? { increment: 1 } : undefined,
              draws: isDraw ? { increment: 1 } : undefined,
              winStreak,
            },
          });
          if (seasonId) {
            await prisma.minigameSeasonRating.upsert({
              where: { userId_gameId_seasonId: { userId, gameId: room.gameId, seasonId } },
              create: {
                userId,
                gameId: room.gameId,
                seasonId,
                mmr: 1000 + mmrChange,
                tier: tierFromMmr(1000 + mmrChange),
                wins: won ? 1 : 0,
                losses: lost ? 1 : 0,
                draws: isDraw ? 1 : 0,
              },
              update: {
                mmr: { increment: Math.round(mmrChange) },
                wins: won ? { increment: 1 } : undefined,
                losses: lost ? { increment: 1 } : undefined,
                draws: isDraw ? { increment: 1 } : undefined,
              },
            });
          }
          await checkAchievements(prisma, userId, room.gameId, won);
        };

        if (isDraw) {
          await apply(a!, ra, delta.win, false, false);
          await apply(b!, rb, delta.lose, false, false);
        } else if (room.winnerId === a) {
          await apply(a!, ra, delta.win, true, false);
          await apply(b!, rb, delta.lose, false, true);
        } else if (room.winnerId === b) {
          await apply(b!, rb, delta.win, true, false);
          await apply(a!, ra, delta.lose, false, true);
        }
      }
    }

    if (room.gameId === "parking-rush") {
      const summaries = parseParkingSummaries(room.moveHistory);
      for (const s of summaries) {
        const won = room.winnerId === s.userId;
        await upsertParkingRating(prisma, s.userId, s, won, seasonId);
        await checkParkingAchievements(prisma, s.userId, s, won);
      }
    }

    return match.id;
  } catch (e) {
    console.warn("[minigame] persist skipped:", (e as Error).message);
    return null;
  }
}

export async function ensureDefaultSeason(prisma: PrismaClient) {
  try {
    const existing = await prisma.minigameSeason.findFirst({ where: { active: true } });
    if (existing) return;
    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + 3);
    await prisma.minigameSeason.create({
      data: { name: "시즌 1", startsAt: now, endsAt: end, active: true },
    });
  } catch {
    /* ignore */
  }
}
