import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { RankTier } from "@/lib/minigames/parking-rush-logic";

type ParkingSummary = {
  type: "parking_summary";
  userId: string;
  mode: string;
  levelName: string;
  score: number;
  parked: boolean;
  tier: RankTier;
};

function parseSummaries(moves: unknown): ParkingSummary[] {
  if (!Array.isArray(moves)) return [];
  return moves.filter(
    (m): m is ParkingSummary =>
      !!m &&
      typeof m === "object" &&
      (m as ParkingSummary).type === "parking_summary" &&
      typeof (m as ParkingSummary).userId === "string"
  );
}

export async function GET(req: NextRequest) {
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10), 50);

  try {
    const matches = await db.minigameMatch.findMany({
      where: { gameId: "parking-rush" },
      orderBy: { endedAt: "desc" },
      take: 400,
    });

    const rows: {
      userId: string;
      username: string;
      score: number;
      tier: RankTier;
      levelName: string;
      mode: string;
      parked: boolean;
    }[] = [];

    for (const m of matches) {
      const summaries = parseSummaries(m.moves);
      const names = (m.playerNames as Record<string, string> | null) ?? {};
      for (const summary of summaries) {
        if (summary.score <= 0) continue;
        rows.push({
          userId: summary.userId,
          username: names[summary.userId] ?? summary.userId.slice(0, 6),
          score: summary.score,
          tier: summary.tier,
          levelName: summary.levelName,
          mode: summary.mode,
          parked: summary.parked,
        });
      }
    }

    const bestByUser = new Map<string, (typeof rows)[0]>();
    for (const r of rows) {
      const prev = bestByUser.get(r.userId);
      if (!prev || r.score > prev.score || (r.score === prev.score && r.parked && !prev.parked)) {
        bestByUser.set(r.userId, r);
      }
    }

    const entries = [...bestByUser.values()]
      .sort((a, b) => b.score - a.score || Number(b.parked) - Number(a.parked))
      .slice(0, limit)
      .map((e, i) => ({ rank: i + 1, ...e }));

    return NextResponse.json({ entries });
  } catch {
    return NextResponse.json({ entries: [], error: "DB 미설정" });
  }
}
