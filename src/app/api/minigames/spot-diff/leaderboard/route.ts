import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type SpotSummary = {
  type: "spot_summary";
  userId: string;
  playStyle: string;
  puzzlesCleared: number;
  totalScore: number;
  elapsedMs: number;
};

function parseSummaries(moves: unknown): SpotSummary[] {
  if (!Array.isArray(moves)) return [];
  return moves.filter(
    (m): m is SpotSummary =>
      !!m &&
      typeof m === "object" &&
      (m as SpotSummary).type === "spot_summary" &&
      typeof (m as SpotSummary).userId === "string"
  );
}

export async function GET(req: NextRequest) {
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10), 50);
  const sort = req.nextUrl.searchParams.get("sort") ?? "cleared";

  try {
    const matches = await db.minigameMatch.findMany({
      where: { gameId: "spot-diff" },
      orderBy: { endedAt: "desc" },
      take: 300,
    });

    const rows: {
      userId: string;
      username: string;
      puzzlesCleared: number;
      totalScore: number;
      elapsedMs: number;
      playStyle: string;
    }[] = [];

    for (const m of matches) {
      const summaries = parseSummaries(m.moves);
      const summary = summaries[summaries.length - 1];
      if (!summary || summary.puzzlesCleared <= 0) continue;
      const names = (m.playerNames as Record<string, string> | null) ?? {};
      rows.push({
        userId: summary.userId,
        username: names[summary.userId] ?? summary.userId.slice(0, 6),
        puzzlesCleared: summary.puzzlesCleared,
        totalScore: summary.totalScore,
        elapsedMs: summary.elapsedMs,
        playStyle: summary.playStyle,
      });
    }

    rows.sort((a, b) => {
      if (sort === "score") return b.totalScore - a.totalScore;
      if (sort === "time") return a.elapsedMs - b.elapsedMs;
      return b.puzzlesCleared - a.puzzlesCleared || b.totalScore - a.totalScore;
    });

    const bestByUser = new Map<string, (typeof rows)[0]>();
    for (const r of rows) {
      const prev = bestByUser.get(r.userId);
      if (!prev || r.puzzlesCleared > prev.puzzlesCleared || (r.puzzlesCleared === prev.puzzlesCleared && r.totalScore > prev.totalScore)) {
        bestByUser.set(r.userId, r);
      }
    }

    const entries = [...bestByUser.values()]
      .sort((a, b) => b.puzzlesCleared - a.puzzlesCleared || b.totalScore - a.totalScore)
      .slice(0, limit)
      .map((e, i) => ({ rank: i + 1, ...e }));

    return NextResponse.json({ entries });
  } catch {
    return NextResponse.json({ entries: [], error: "DB 미설정" });
  }
}
