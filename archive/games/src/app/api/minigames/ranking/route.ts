import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const gameId = req.nextUrl.searchParams.get("gameId") ?? "omok";
  const period = req.nextUrl.searchParams.get("period") ?? "all";
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10), 100);

  try {
    if (period === "season") {
      const season = await db.minigameSeason.findFirst({
        where: { active: true },
        orderBy: { startsAt: "desc" },
      });
      if (!season) return NextResponse.json({ entries: [], season: null });
      const rows = await db.minigameSeasonRating.findMany({
        where: { gameId, seasonId: season.id },
        orderBy: { mmr: "desc" },
        take: limit,
      });
      const userIds = rows.map((r) => r.userId);
      const users = await db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true, name: true, image: true },
      });
      const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
      return NextResponse.json({
        season: { id: season.id, name: season.name, endsAt: season.endsAt },
        entries: rows.map((r, i) => ({
          rank: i + 1,
          userId: r.userId,
          username: userMap[r.userId]?.username ?? userMap[r.userId]?.name ?? "유저",
          mmr: r.mmr,
          tier: r.tier,
          wins: r.wins,
          losses: r.losses,
        })),
      });
    }

    const rows = await db.minigameRating.findMany({
      where: { gameId },
      orderBy: { mmr: "desc" },
      take: limit,
    });
    const userIds = rows.map((r) => r.userId);
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, name: true },
    });
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
    return NextResponse.json({
      entries: rows.map((r, i) => ({
        rank: i + 1,
        userId: r.userId,
        username: userMap[r.userId]?.username ?? userMap[r.userId]?.name ?? "유저",
        mmr: r.mmr,
        tier: r.tier,
        wins: r.wins,
        losses: r.losses,
        winStreak: r.winStreak,
      })),
    });
  } catch {
    return NextResponse.json({ entries: [], error: "DB 미설정 — Z4 SQL 실행 필요" });
  }
}
