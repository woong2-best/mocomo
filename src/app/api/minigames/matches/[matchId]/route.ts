import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Props = { params: Promise<{ matchId: string }> };

export async function GET(_req: NextRequest, { params }: Props) {
  const { matchId } = await params;
  try {
    const match = await db.minigameMatch.findUnique({ where: { id: matchId } });
    if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({
      id: match.id,
      gameId: match.gameId,
      roomId: match.roomId,
      winnerId: match.winnerId,
      result: match.result,
      playerIds: match.playerIds,
      playerNames: match.playerNames,
      moves: match.moves ?? [],
      initialState: match.initialState,
      startedAt: match.startedAt,
      endedAt: match.endedAt,
    });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
