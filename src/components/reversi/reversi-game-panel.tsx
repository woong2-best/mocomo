"use client";

import { useState } from "react";
import { Flag, SkipForward, Timer } from "lucide-react";
import { ReversiBoard } from "@/components/reversi/reversi-board";
import { Button } from "@/components/ui/button";
import { REVERSI_TURN_MS } from "@/lib/minigames/reversi-logic";
import type { MinigamePlayerPublic } from "@/lib/minigames/shared-types";
import { cn } from "@/lib/utils";

type Props = {
  board: number[][];
  turn: 1 | 2;
  turnUserId: string | null;
  blackUserId: string;
  whiteUserId: string;
  validMoves: { x: number; y: number }[];
  scores: { black: number; white: number };
  passStreak: number;
  lastMove: { x: number; y: number } | null;
  lastNotice: string | null;
  useTurnTimer: boolean;
  timeLeft: number;
  turnLimit: number;
  finalScore?: { black: number; white: number } | null;
  userId?: string;
  isSpectator: boolean;
  finished?: boolean;
  players: MinigamePlayerPublic[];
  onMove: (move: { x: number; y: number } | { pass: true } | { resign: true }) => Promise<boolean>;
};

function playerName(players: MinigamePlayerPublic[], id: string) {
  return players.find((p) => p.userId === id)?.username ?? "플레이어";
}

export function ReversiGamePanel({
  board,
  turn,
  turnUserId,
  blackUserId,
  whiteUserId,
  validMoves,
  scores,
  passStreak,
  lastMove,
  lastNotice,
  useTurnTimer,
  timeLeft,
  turnLimit,
  finalScore,
  userId,
  isSpectator,
  finished,
  players,
  onMove,
}: Props) {
  const [placing, setPlacing] = useState(false);
  const myTurn = turnUserId === userId && !isSpectator && !finished;
  const canPass = myTurn && validMoves.length === 0;
  const turnName = turnUserId ? playerName(players, turnUserId) : "—";
  const pct = turnLimit > 0 ? Math.min(100, (timeLeft / turnLimit) * 100) : 0;
  const urgent = useTurnTimer && timeLeft <= 10 && !finished;
  const displayScores = finalScore ?? scores;

  async function play(move: Parameters<Props["onMove"]>[0]) {
    if ("pass" in move && !canPass) return;
    if (!myTurn && !("resign" in move)) return;
    if ("resign" in move && userId !== blackUserId && userId !== whiteUserId) return;
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
            흑 {playerName(players, blackUserId)} · {displayScores.black}
          </span>
          <span>
            <span className="inline-block w-3 h-3 rounded-full bg-white border mr-1 align-middle" />
            백 {playerName(players, whiteUserId)} · {displayScores.white}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {useTurnTimer && <Timer className={cn("h-4 w-4", urgent && "text-red-600 animate-pulse")} />}
          <span className={cn(urgent && "text-red-600 font-semibold")}>
            {finished
              ? "종료"
              : myTurn
                ? `내 턴 (${turn === 1 ? "흑" : "백"})`
                : `${turnName} (${turn === 1 ? "흑" : "백"})`}
            {useTurnTimer && !finished && ` · ${timeLeft}초`}
          </span>
          {passStreak === 1 && !finished && (
            <span className="text-xs text-muted-foreground">· 1패스</span>
          )}
        </div>
        {useTurnTimer && (
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full transition-all", urgent ? "bg-red-500" : "bg-folk-cobalt")}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
        {lastNotice && !finished && (
          <p className="text-xs text-muted-foreground">{lastNotice}</p>
        )}
        {finalScore && (
          <p className="text-sm font-medium">
            결과 — 흑 {finalScore.black} : 백 {finalScore.white}
          </p>
        )}
      </div>

      <ReversiBoard
        board={board}
        validMoves={myTurn ? validMoves : []}
        lastMove={lastMove}
        disabled={!myTurn || finished}
        placing={placing}
        onCellClick={(x, y) => void play({ x, y })}
      />

      <p className="text-center text-xs text-muted-foreground">
        ○ 표시 = 합법 수 · 클릭 시 서버 검증 후 돌 배치·뒤집기 · 둘 곳 없으면 자동 패스
      </p>

      {(myTurn || (userId === blackUserId || userId === whiteUserId)) && !finished && (
        <div className="flex flex-wrap justify-center gap-2">
          {canPass && (
            <Button type="button" variant="outline" size="sm" onClick={() => void play({ pass: true })}>
              <SkipForward className="h-4 w-4 mr-1" />
              패스
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => void play({ resign: true })}>
            <Flag className="h-4 w-4 mr-1" />
            기권
          </Button>
        </div>
      )}
    </div>
  );
}

export { REVERSI_TURN_MS };
