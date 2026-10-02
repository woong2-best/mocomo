"use client";

import { useState } from "react";
import { Flag, SkipForward, Timer } from "lucide-react";
import { BadukBoard } from "@/components/baduk/baduk-board";
import { Button } from "@/components/ui/button";
import type { Stone } from "@/lib/minigames/baduk-logic";
import { BADUK_TURN_MS } from "@/lib/minigames/baduk-logic";
import type { MinigamePlayerPublic } from "@/lib/minigames/shared-types";
import { cn } from "@/lib/utils";

type Props = {
  board: Stone[][];
  boardSize: number;
  turn: 1 | 2;
  turnUserId: string | null;
  blackUserId: string;
  whiteUserId: string;
  captures: { black: number; white: number };
  passStreak: number;
  lastMove: { x: number; y: number } | null;
  timeLeft: number;
  turnLimit: number;
  komi: number;
  finalScore?: {
    black: number;
    white: number;
    blackTerritory: number;
    whiteTerritory: number;
    blackCaptures: number;
    whiteCaptures: number;
    komi: number;
  } | null;
  userId?: string;
  isSpectator: boolean;
  finished?: boolean;
  players: MinigamePlayerPublic[];
  onMove: (move: { x: number; y: number } | { pass: true } | { resign: true }) => Promise<boolean>;
};

function playerName(players: MinigamePlayerPublic[], id: string) {
  return players.find((p) => p.userId === id)?.username ?? "플레이어";
}

export function BadukGamePanel({
  board,
  boardSize,
  turn,
  turnUserId,
  blackUserId,
  whiteUserId,
  captures,
  passStreak,
  lastMove,
  timeLeft,
  turnLimit,
  komi,
  finalScore,
  userId,
  isSpectator,
  finished,
  players,
  onMove,
}: Props) {
  const [placing, setPlacing] = useState(false);
  const myTurn = turnUserId === userId && !isSpectator && !finished;
  const iAmBlack = userId === blackUserId;
  const turnName = turnUserId ? playerName(players, turnUserId) : "—";
  const pct = turnLimit > 0 ? Math.min(100, (timeLeft / turnLimit) * 100) : 0;
  const urgent = timeLeft <= 10 && !finished;

  async function play(move: Parameters<Props["onMove"]>[0]) {
    if (!myTurn || placing) return;
    setPlacing(true);
    try {
      await onMove(move);
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border-2 border-folk-cobalt/20 bg-folk-gold/10 px-4 py-3 space-y-2">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span>
            <span className="inline-block w-3 h-3 rounded-full bg-neutral-900 mr-1 align-middle" />
            흑 {playerName(players, blackUserId)} · 따낸 돌 {captures.black}
          </span>
          <span>
            <span className="inline-block w-3 h-3 rounded-full bg-white border mr-1 align-middle" />
            백 {playerName(players, whiteUserId)} · 따낸 돌 {captures.white}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Timer className={cn("h-4 w-4", urgent && "text-red-600 animate-pulse")} />
          <span className={cn(urgent && "text-red-600 font-semibold")}>
            {finished
              ? "종료"
              : `${turnName} (${turn === 1 ? "흑" : "백"}) · ${timeLeft}초`}
          </span>
          <span className="text-muted-foreground text-xs">
            {boardSize}×{boardSize} · komi {komi}
            {passStreak === 1 ? " · 1패스" : ""}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full transition-all", urgent ? "bg-red-500" : "bg-folk-cobalt")}
            style={{ width: `${pct}%` }}
          />
        </div>
        {finalScore && (
          <p className="text-sm font-medium">
            집 계산 — 흑 {finalScore.black.toFixed(1)} : 백 {finalScore.white.toFixed(1)} (빈집 흑
            {finalScore.blackTerritory} 백{finalScore.whiteTerritory})
          </p>
        )}
      </div>

      <BadukBoard
        board={board}
        boardSize={boardSize}
        lastMove={lastMove}
        myStoneBlack={isSpectator ? turn === 1 : iAmBlack}
        disabled={!myTurn || finished}
        placing={placing}
        onCellClick={(x, y) => void play({ x, y })}
      />

      {myTurn && !finished && (
        <div className="flex flex-wrap justify-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void play({ pass: true })}>
            <SkipForward className="h-4 w-4 mr-1" />
            패스
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void play({ resign: true })}>
            <Flag className="h-4 w-4 mr-1" />
            기권
          </Button>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        교차점 클릭 · 돌 따내기 · 패(Ko) · 자충수 금지 · 연속 2패스 시 집 계산
      </p>
    </div>
  );
}

export { BADUK_TURN_MS };
