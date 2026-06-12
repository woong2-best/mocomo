"use client";

import { notFound } from "next/navigation";
import { useState } from "react";
import { getMinigameById } from "@/lib/minigames/registry";
import { getMinigameRoute } from "@/lib/minigames/game-meta";
import { MinigameHubShell } from "@/components/minigames/minigame-hub-shell";
import type { GamePlayMode } from "@/lib/games-lobby";

export function PlayHubClient({ gameId }: { gameId: string }) {
  const game = getMinigameById(gameId);
  const [mode, setMode] = useState<GamePlayMode>("friends");

  if (!game || game.status === "coming_soon" || !game.href) notFound();

  const Icon = game.icon;
  const routeBase = getMinigameRoute(gameId);

  return (
    <MinigameHubShell
      gameId={gameId}
      routeBase={routeBase}
      title={game.name}
      description={game.description}
      icon={Icon}
      mode={mode}
      onModeChange={setMode}
    />
  );
}
