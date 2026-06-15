import type { PrismaClient } from "@prisma/client";
import type { RankTier } from "./parking-rush-logic";

export type ParkingSummary = {
  type: "parking_summary";
  userId: string;
  mode: string;
  levelId: string;
  levelName: string;
  score: number;
  parked: boolean;
  collisions: number;
  tier: RankTier;
  vehicleId: string;
  reversePark?: boolean;
  rank?: number | null;
};

export function parseParkingSummaries(moves: unknown): ParkingSummary[] {
  if (!Array.isArray(moves)) return [];
  return moves.filter(
    (m): m is ParkingSummary =>
      !!m &&
      typeof m === "object" &&
      (m as ParkingSummary).type === "parking_summary" &&
      typeof (m as ParkingSummary).userId === "string"
  );
}

export function seasonPointsFromSummary(s: ParkingSummary): number {
  let pts = Math.floor(s.score / 50);
  if (s.parked) pts += 120;
  if (s.collisions === 0) pts += 80;
  if (s.reversePark) pts += 40;
  if (s.rank === 1) pts += 100;
  return pts;
}

export async function unlockAchievement(prisma: PrismaClient, userId: string, achievementId: string) {
  try {
    await prisma.minigameUserAchievement.upsert({
      where: { userId_achievementId: { userId, achievementId } },
      create: { userId, achievementId },
      update: {},
    });
  } catch {
    /* ignore */
  }
}

export async function checkParkingAchievements(prisma: PrismaClient, userId: string, s: ParkingSummary, won: boolean) {
  if (s.parked) await unlockAchievement(prisma, userId, "parking_first");
  if (s.parked && s.collisions === 0) await unlockAchievement(prisma, userId, "parking_clean");
  if (s.parked && s.reversePark) await unlockAchievement(prisma, userId, "parking_reverse");
  if (s.tier === "grandmaster") await unlockAchievement(prisma, userId, "parking_grandmaster");
  if (won && s.parked && (s.mode === "duel" || s.mode === "ranked")) {
    await unlockAchievement(prisma, userId, "parking_duel_win");
  }
}

export async function upsertParkingRating(
  prisma: PrismaClient,
  userId: string,
  s: ParkingSummary,
  won: boolean,
  seasonId: string | null
) {
  const delta = Math.round(s.score / 40) + (won ? 25 : 0) + (s.parked ? 15 : -5);
  const existing = await prisma.minigameRating.findUnique({
    where: { userId_gameId: { userId, gameId: "parking-rush" } },
  });

  if (!existing) {
    const mmr = Math.max(100, 1000 + delta);
    await prisma.minigameRating.create({
      data: {
        userId,
        gameId: "parking-rush",
        mmr,
        tier: tierFromParkingScore(mmr),
        wins: won ? 1 : 0,
        losses: !won && !s.parked ? 1 : 0,
        winStreak: won ? 1 : 0,
      },
    });
  } else {
    const nextMmr = Math.max(100, existing.mmr + delta);
    await prisma.minigameRating.update({
      where: { userId_gameId: { userId, gameId: "parking-rush" } },
      data: {
        mmr: nextMmr,
        tier: tierFromParkingScore(nextMmr),
        wins: won ? { increment: 1 } : undefined,
        losses: !won && !s.parked ? { increment: 1 } : undefined,
        winStreak: won ? existing.winStreak + 1 : 0,
      },
    });
  }

  if (seasonId) {
    const pts = seasonPointsFromSummary(s);
    const seasonExisting = await prisma.minigameSeasonRating.findUnique({
      where: { userId_gameId_seasonId: { userId, gameId: "parking-rush", seasonId } },
    });
    const nextSeasonMmr = (seasonExisting?.mmr ?? 1000) + pts;
    await prisma.minigameSeasonRating.upsert({
      where: { userId_gameId_seasonId: { userId, gameId: "parking-rush", seasonId } },
      create: {
        userId,
        gameId: "parking-rush",
        seasonId,
        mmr: nextSeasonMmr,
        tier: tierFromParkingScore(nextSeasonMmr),
        wins: won ? 1 : 0,
        losses: 0,
      },
      update: {
        mmr: nextSeasonMmr,
        tier: tierFromParkingScore(nextSeasonMmr),
        wins: won ? { increment: 1 } : undefined,
      },
    });
  }
}

function tierFromParkingScore(mmr: number): string {
  if (mmr >= 2200) return "MASTER";
  if (mmr >= 1900) return "DIAMOND";
  if (mmr >= 1600) return "PLATINUM";
  if (mmr >= 1300) return "GOLD";
  if (mmr >= 1100) return "SILVER";
  return "BRONZE";
}

export async function bestParkingShowcase(prisma: PrismaClient, userId: string) {
  const profile = await prisma.profile.findUnique({ where: { userId }, select: { snsLinks: true } });
  const links = (profile?.snsLinks as Record<string, unknown> | null) ?? {};
  const pinned = links.mocomoMinigame as { parkingShowcase?: ShowcaseData } | undefined;
  if (pinned?.parkingShowcase) return pinned.parkingShowcase;

  const matches = await prisma.minigameMatch.findMany({
    where: { gameId: "parking-rush" },
    orderBy: { endedAt: "desc" },
    take: 200,
    select: { moves: true, playerIds: true },
  });

  let best: ShowcaseData | null = null;
  for (const m of matches) {
    const ids = m.playerIds as string[];
    if (!ids.includes(userId)) continue;
    for (const s of parseParkingSummaries(m.moves)) {
      if (s.userId !== userId) continue;
      if (!best || s.score > best.score) {
        best = {
          vehicleId: s.vehicleId,
          carColor: undefined,
          tier: s.tier,
          score: s.score,
          levelName: s.levelName,
          parked: s.parked,
        };
      }
    }
  }
  return best;
}

export type ShowcaseData = {
  vehicleId: string;
  carColor?: string;
  tier: RankTier;
  score: number;
  levelName: string;
  parked: boolean;
};

export async function saveParkingShowcase(prisma: PrismaClient, userId: string, data: ShowcaseData) {
  const profile = await prisma.profile.findUnique({ where: { userId }, select: { snsLinks: true } });
  const links = { ...((profile?.snsLinks as Record<string, unknown> | null) ?? {}) };
  links.mocomoMinigame = { ...(links.mocomoMinigame as object), parkingShowcase: data };
  await prisma.profile.upsert({
    where: { userId },
    create: { userId, snsLinks: links as object },
    update: { snsLinks: links as object },
  });
}
