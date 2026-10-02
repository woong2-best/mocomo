import { PlayHubClient } from "@/components/minigames/play-hub-client";
import { AppPageChrome } from "@/components/layout/app-page-chrome";
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
    <AppPageChrome maxWidth="3xl" spacing="sm">
      <PlayHubClient gameId={gameId} />
    </AppPageChrome>
  );
}
