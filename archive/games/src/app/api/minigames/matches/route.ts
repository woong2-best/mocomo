import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  const gameId = req.nextUrl.searchParams.get("gameId");
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10), 50);

  try {
    const matches = await db.minigameMatch.findMany({
      where: gameId ? { gameId } : undefined,
      orderBy: { endedAt: "desc" },
      take: limit,
    });
    const filtered = session?.user?.id
      ? matches.filter((m) => (m.playerIds as string[]).includes(session.user!.id!))
      : matches;

    return NextResponse.json({
      matches: filtered.map((m) => ({
        id: m.id,
        gameId: m.gameId,
        roomId: m.roomId,
        winnerId: m.winnerId,
        result: m.result,
        playerIds: m.playerIds,
        playerNames: m.playerNames,
        endedAt: m.endedAt,
        moveCount: Array.isArray(m.moves) ? (m.moves as unknown[]).length : 0,
      })),
    });
  } catch {
    return NextResponse.json({ matches: [] });
  }
}
