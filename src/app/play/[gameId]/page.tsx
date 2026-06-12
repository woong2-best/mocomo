import { PlayHubClient } from "@/components/minigames/play-hub-client";
import { getMinigameById } from "@/lib/minigames/registry";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ gameId: string }> };

export async function generateMetadata({ params }: Props) {
  const { gameId } = await params;
  const game = getMinigameById(gameId);
  return { title: game ? `${game.name} | MoCoMo` : "미니게임" };
}

export default async function PlayGamePage({ params }: Props) {
  const { gameId } = await params;
  if (!getMinigameById(gameId)) notFound();
  return (
    <div className="max-w-3xl mx-auto p-4 py-8">
      <PlayHubClient gameId={gameId} />
    </div>
  );
}
