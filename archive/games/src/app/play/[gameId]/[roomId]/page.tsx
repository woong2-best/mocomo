import { PlayRoomClient } from "@/components/minigames/play-room-client";
import { GameRoomPageShell } from "@/components/minigames/game-room-page-shell";
import { getMinigameById } from "@/lib/minigames/registry";
import { isValidRoomCode } from "@/lib/sketch-quiz-words";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ gameId: string; roomId: string }>;
  searchParams: Promise<{ join?: string; spectate?: string; create?: string; public?: string }>;
};

export default async function PlayRoomPage({ params, searchParams }: Props) {
  const { gameId, roomId } = await params;
  const { join, spectate, create } = await searchParams;
  if (!getMinigameById(gameId)) notFound();
  const code = roomId.toUpperCase();
  if (!isValidRoomCode(code)) notFound();
  const mode =
    spectate === "1" ? "spectate" : create === "1" ? "create" : join === "1" ? "join" : "join";

  return (
    <GameRoomPageShell>
      <PlayRoomClient gameId={gameId} roomId={code} mode={mode} />
    </GameRoomPageShell>
  );
}
