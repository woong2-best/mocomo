"use client";

import { useActivity } from "@/components/activities/activity-provider";
import type { TttGameState } from "@/lib/activities/tic-tac-toe";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";

export function TicTacToeBoard() {
  const { session, applyLocalGameEvent } = useActivity();
  const { data } = useSession();
  const meId = data?.user?.id ?? "";
  const state = session?.gameState as unknown as TttGameState | null;

  if (!state) {
    return (
      <p className="text-xs text-muted-foreground text-center py-6">보드를 준비하는 중…</p>
    );
  }

  const myMark = state.xPlayerId === meId ? "X" : state.oPlayerId === meId ? "O" : null;
  const myTurn = myMark === state.turn && !state.winner;

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-center text-muted-foreground">
        {state.winner
          ? state.winner === "draw"
            ? "무승부"
            : `${state.winner} 승리`
          : myTurn
            ? "당신 차례"
            : "상대 차례"}
        {myMark ? ` · 당신은 ${myMark}` : ""}
      </p>
      <div className="grid grid-cols-3 gap-1.5 max-w-[220px] mx-auto">
        {state.board.map((cell, i) => (
          <button
            key={i}
            type="button"
            disabled={!myTurn || !!cell || !!state.winner}
            onClick={() => applyLocalGameEvent("move", i)}
            className={cn(
              "aspect-square rounded-lg border-2 text-xl font-bold transition-colors",
              "border-folk-cobalt/25 bg-background hover:border-folk-terracotta/40",
              "disabled:opacity-80 disabled:hover:border-folk-cobalt/25"
            )}
          >
            {cell ?? ""}
          </button>
        ))}
      </div>
    </div>
  );
}
