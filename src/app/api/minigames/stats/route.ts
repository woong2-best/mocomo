import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMinigameById } from "@/lib/minigames/registry";
import { TIER_LABELS } from "@/lib/minigames/mmr";
import type { MinigameTier } from "@/lib/minigames/types";
import { MINIGAME_ACHIEVEMENTS } from "@/lib/minigames/achievements";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const username = req.nextUrl.searchParams.get("username");

  try {
    let uid = userId;
    if (!uid && username) {
      const user = await db.user.findFirst({
        where: { username: username.replace(/^@/, "") },
        select: { id: true },
      });
      uid = user?.id ?? null;
    }
    if (!uid) return NextResponse.json({ error: "userId or username required" }, { status: 400 });

    const [ratings, recentMatches, achievements, seasonRating] = await Promise.all([
      db.minigameRating.findMany({
        where: { userId: uid },
        orderBy: { mmr: "desc" },
        take: 8,
      }),
      db.minigameMatch.findMany({
        orderBy: { endedAt: "desc" },
        take: 200,
        select: { playerIds: true },
      }),
      db.minigameUserAchievement.findMany({ where: { userId: uid } }),
      db.minigameSeason.findFirst({
        where: { active: true },
        orderBy: { startsAt: "desc" },
      }),
    ]);

    const matchCount = recentMatches.filter((m) =>
      Array.isArray(m.playerIds) && (m.playerIds as string[]).includes(uid!)
    ).length;

    const seasonRatings = seasonRating
      ? await db.minigameSeasonRating.findMany({
          where: { userId: uid, seasonId: seasonRating.id },
          orderBy: { mmr: "desc" },
          take: 5,
        })
      : [];

    const achSet = new Set(achievements.map((a) => a.achievementId));

    return NextResponse.json({
      userId: uid,
      totalMatches: matchCount,
      ratings: ratings.map((r) => ({
        gameId: r.gameId,
        gameName: getMinigameById(r.gameId)?.name ?? r.gameId,
        mmr: r.mmr,
        tier: r.tier,
        tierLabel: TIER_LABELS[r.tier as MinigameTier] ?? r.tier,
        wins: r.wins,
        losses: r.losses,
        winStreak: r.winStreak,
      })),
      season: seasonRating
        ? {
            id: seasonRating.id,
            name: seasonRating.name,
            endsAt: seasonRating.endsAt,
            ratings: seasonRatings.map((r) => ({
              gameId: r.gameId,
              gameName: getMinigameById(r.gameId)?.name ?? r.gameId,
              mmr: r.mmr,
              tier: r.tier,
            })),
          }
        : null,
      achievements: {
        unlocked: achievements.length,
        total: MINIGAME_ACHIEVEMENTS.length,
        recent: achievements.slice(0, 3).map((a) => ({
          id: a.achievementId,
          name: MINIGAME_ACHIEVEMENTS.find((x) => x.id === a.achievementId)?.name ?? a.achievementId,
          unlockedAt: a.unlockedAt,
        })),
      },
    });
  } catch {
    return NextResponse.json({ ratings: [], totalMatches: 0, achievements: { unlocked: 0, total: 7 } });
  }
}
