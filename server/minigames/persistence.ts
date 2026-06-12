import type { PrismaClient } from "@prisma/client";
import { mmrDelta, tierFromMmr } from "../../src/lib/minigames/mmr";
import type { MinigameRoomInternal } from "./types";

/** 게임 종료 시 전적·MMR 저장 (DB 없으면 무시) */
export async function persistMinigameResult(
  prisma: PrismaClient,
  room: MinigameRoomInternal
): Promise<void> {
  try {
    const playerIds = [...room.players.keys()];
    const endedAt = new Date();
    await prisma.minigameMatch.create({
      data: {
        gameId: room.gameId,
        roomId: room.id,
        winnerId: room.winnerId,
        result: room.resultMessage,
        playerIds,
        moves: room.moveHistory as object[],
        endedAt,
      },
    });

    if (playerIds.length === 2 && room.winnerId) {
      const [a, b] = playerIds;
      const loserId = room.winnerId === a ? b! : a!;
      if (room.winnerId === loserId) return;

      for (const uid of playerIds) {
        await prisma.minigameRating.upsert({
          where: { userId_gameId: { userId: uid, gameId: room.gameId } },
          create: {
            userId: uid,
            gameId: room.gameId,
            mmr: 1000,
            tier: "BRONZE",
            wins: uid === room.winnerId ? 1 : 0,
            losses: uid === room.winnerId ? 0 : 1,
            draws: 0,
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
      if (!ra || !rb) return;

      const draw = !room.winnerId;
      const delta =
        room.winnerId === a
          ? mmrDelta(ra.mmr, rb.mmr, draw)
          : mmrDelta(rb.mmr, ra.mmr, draw);

      const updatePair = async (userId: string, mmrChange: number, won: boolean) => {
        const cur = userId === a ? ra : rb;
        const nextMmr = Math.max(100, Math.round(cur.mmr + mmrChange));
        await prisma.minigameRating.update({
          where: { userId_gameId: { userId, gameId: room.gameId } },
          data: {
            mmr: nextMmr,
            tier: tierFromMmr(nextMmr),
            wins: won ? { increment: 1 } : undefined,
            losses: !won && !draw ? { increment: 1 } : undefined,
            draws: draw ? { increment: 1 } : undefined,
          },
        });
      };

      if (draw) {
        await updatePair(a!, delta.win, false);
        await updatePair(b!, delta.lose, false);
      } else if (room.winnerId === a) {
        await updatePair(a!, delta.win, true);
        await updatePair(b!, delta.lose, false);
      } else {
        await updatePair(b!, delta.win, true);
        await updatePair(a!, delta.lose, false);
      }
    }
  } catch (e) {
    console.warn("[minigame] persist skipped:", (e as Error).message);
  }
}
