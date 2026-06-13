"use client";

import { notFound } from "next/navigation";
import { useState } from "react";
import { getMinigameById } from "@/lib/minigames/registry";
import { getMinigameRoute } from "@/lib/minigames/game-meta";
import { MinigameHubShell } from "@/components/minigames/minigame-hub-shell";
import { ChessPuzzlePanel } from "@/components/chess/chess-puzzle-panel";
import type { GamePlayMode } from "@/lib/games-lobby";
import { cn } from "@/lib/utils";

export function PlayHubClient({ gameId }: { gameId: string }) {
  const game = getMinigameById(gameId);
  const [mode, setMode] = useState<GamePlayMode>("friends");
  const [chessTab, setChessTab] = useState<"play" | "puzzle">("play");

  if (!game || game.status === "coming_soon" || !game.href) notFound();

  const Icon = game.icon;
  const routeBase = getMinigameRoute(gameId);
  const isChess = gameId === "chess";

  return (
    <div className="space-y-4">
      {isChess && (
        <div className="flex justify-center gap-1 p-1 rounded-xl bg-muted/60 max-w-xs mx-auto">
          <button
            type="button"
            onClick={() => setChessTab("play")}
            className={cn(
              "flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              chessTab === "play" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            대국
          </button>
          <button
            type="button"
            onClick={() => setChessTab("puzzle")}
            className={cn(
              "flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              chessTab === "puzzle" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            퍼즐
          </button>
        </div>
      )}

      {isChess && chessTab === "puzzle" ? (
        <ChessPuzzlePanel />
      ) : (
        <MinigameHubShell
          gameId={gameId}
          routeBase={routeBase}
          title={game.name}
          description={game.description}
          icon={Icon}
          mode={mode}
          onModeChange={setMode}
        />
      )}
    </div>
  );
}
