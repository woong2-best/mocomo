import { MinigameReplayClient } from "@/components/minigames/minigame-replay-client";
import { getMinigameById } from "@/lib/minigames/registry";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ gameId: string; matchId: string }> };

export async function generateMetadata({ params }: Props) {
  const { gameId } = await params;
  const g = getMinigameById(gameId);
  return { title: g ? `${g.name} 리플레이 | MoCoMo` : "리플레이" };
}

export default async function ReplayPage({ params }: Props) {
  const { gameId, matchId } = await params;
  if (!getMinigameById(gameId)) notFound();
  return (
    <div className="p-4 py-6">
      <MinigameReplayClient gameId={gameId} matchId={matchId} />
    </div>
  );
}
