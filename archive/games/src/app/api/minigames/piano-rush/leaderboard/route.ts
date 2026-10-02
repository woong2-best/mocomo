import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type PianoSummary = {
  type: "piano_summary";
  userId: string;
  mode: string;
  chartTitle: string;
  score: number;
  maxCombo: number;
  accuracy: number;
};

function parseSummaries(moves: unknown): PianoSummary[] {
  if (!Array.isArray(moves)) return [];
  return moves.filter(
    (m): m is PianoSummary =>
      !!m &&
      typeof m === "object" &&
      (m as PianoSummary).type === "piano_summary" &&
      typeof (m as PianoSummary).userId === "string"
  );
}

export async function GET(req: NextRequest) {
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10), 50);

  try {
    const matches = await db.minigameMatch.findMany({
      where: { gameId: "piano-rush" },
      orderBy: { endedAt: "desc" },
      take: 400,
    });

    const rows: {
      userId: string;
      username: string;
      score: number;
      accuracy: number;
      maxCombo: number;
      chartTitle: string;
      mode: string;
    }[] = [];

    for (const m of matches) {
      const summaries = parseSummaries(m.moves);
      for (const summary of summaries) {
        if (summary.score <= 0) continue;
        const names = (m.playerNames as Record<string, string> | null) ?? {};
        rows.push({
          userId: summary.userId,
          username: names[summary.userId] ?? summary.userId.slice(0, 6),
          score: summary.score,
          accuracy: summary.accuracy,
          maxCombo: summary.maxCombo,
          chartTitle: summary.chartTitle,
          mode: summary.mode,
        });
      }
    }

    const bestByUser = new Map<string, (typeof rows)[0]>();
    for (const r of rows) {
      const prev = bestByUser.get(r.userId);
      if (!prev || r.score > prev.score || (r.score === prev.score && r.accuracy > prev.accuracy)) {
        bestByUser.set(r.userId, r);
      }
    }

    const entries = [...bestByUser.values()]
      .sort((a, b) => b.score - a.score || b.accuracy - a.accuracy)
      .slice(0, limit)
      .map((e, i) => ({ rank: i + 1, ...e }));

    return NextResponse.json({ entries });
  } catch {
    return NextResponse.json({ entries: [], error: "DB 미설정" });
  }
}
