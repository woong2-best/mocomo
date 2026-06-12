import { PlayRoomClient } from "@/components/minigames/play-room-client";
import { getMinigameById } from "@/lib/minigames/registry";
import { isValidRoomCode } from "@/lib/sketch-quiz-words";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ gameId: string; roomId: string }>;
  searchParams: Promise<{ join?: string; spectate?: string; public?: string }>;
};

export default async function PlayRoomPage({ params, searchParams }: Props) {
  const { gameId, roomId } = await params;
  const { join, spectate } = await searchParams;
  if (!getMinigameById(gameId)) notFound();
  const code = roomId.toUpperCase();
  if (!isValidRoomCode(code)) notFound();
  const mode = spectate === "1" ? "spectate" : join === "1" ? "join" : "create";

  return (
    <div className="max-w-5xl mx-auto p-4 py-6">
      <PlayRoomClient gameId={gameId} roomId={code} mode={mode} />
    </div>
  );
}
