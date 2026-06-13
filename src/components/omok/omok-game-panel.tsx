"use client";

import { useState } from "react";
import { Timer } from "lucide-react";
import { OmokBoard } from "@/components/omok/omok-board";
import type { MinigamePlayerPublic } from "@/lib/minigames/shared-types";
import { cn } from "@/lib/utils";

type Props = {
  board: number[][];
  turn: "black" | "white";
  turnUserId: string | null;
  blackUserId: string;
  whiteUserId: string;
  lastMove: { x: number; y: number } | null;
  winLine: { x: number; y: number }[] | null;
  timeLeft: number;
  turnLimit: number;
  ruleMode: "free" | "renju";
  moveCount: number;
  userId?: string;
  isSpectator: boolean;
  finished?: boolean;
  players: MinigamePlayerPublic[];
  onMove: (move: { x: number; y: number }) => Promise<boolean>;
};

function playerName(players: MinigamePlayerPublic[], id: string) {
  return players.find((p) => p.userId === id)?.username ?? "플레이어";
}

export function OmokGamePanel({
  board,
  turn,
  turnUserId,
  blackUserId,
  whiteUserId,
  lastMove,
  winLine,
  timeLeft,
  turnLimit,
  ruleMode,
  moveCount,
  userId,
  isSpectator,
  finished,
  players,
  onMove,
}: Props) {
  const [placing, setPlacing] = useState(false);
  const myTurn = turnUserId === userId && !isSpectator && !finished;
  const iAmBlack = userId === blackUserId;
  const iAmWhite = userId === whiteUserId;
  const turnName = turnUserId ? playerName(players, turnUserId) : "—";
  const pct = turnLimit > 0 ? Math.min(100, (timeLeft / turnLimit) * 100) : 0;
  const urgent = timeLeft <= 5 && !finished;

  const phaseLabel = finished
    ? "종료"
    : placing
      ? "LOCKED — 서버 확인 중"
      : myTurn
        ? "ACTIVE — 내 턴"
        : `WAITING — ${turnName} (${turn === "black" ? "흑" : "백"})`;

  async function handleCell(x: number, y: number) {
    if (!myTurn || placing) return;
    setPlacing(true);
    try {
      await onMove({ x, y });
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border-2 border-folk-cobalt/20 bg-folk-gold/10 px-4 py-3 space-y-2">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span
            className={cn(
              "font-display font-bold",
              myTurn && !placing && "text-folk-terracotta",
              placing && "text-muted-foreground"
            )}
          >
            {phaseLabel}
          </span>
          {!finished && (
            <div
              className={cn(
                "flex items-center gap-1.5 tabular-nums ml-auto",
                urgent && "text-destructive animate-pulse"
              )}
            >
              <Timer className="h-4 w-4" />
              <span>{timeLeft}초</span>
            </div>
          )}
        </div>
        {!finished && (
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-1000 ease-linear",
                urgent ? "bg-destructive" : "bg-folk-terracotta"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {!isSpectator && (iAmBlack || iAmWhite) && (
            <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
              <span
                className={cn(
                  "inline-block w-3 h-3 rounded-full border",
                  iAmBlack ? "bg-neutral-900 border-neutral-600" : "bg-neutral-100 border-neutral-400"
                )}
              />
              내 돌: {iAmBlack ? "흑" : "백"}
            </span>
          )}
          <span>
            흑 {playerName(players, blackUserId)} · 백 {playerName(players, whiteUserId)}
          </span>
          <span>{moveCount}수 · {ruleMode === "renju" ? "렌주" : "자유"}</span>
        </div>
      </div>

      {!finished && myTurn && !placing && (
        <p className="text-center text-xs text-muted-foreground">
          빈 교차점을 클릭/탭하면 돌을 놓습니다
        </p>
      )}

      <OmokBoard
        board={board}
        lastMove={lastMove}
        winLine={winLine}
        myStoneBlack={iAmBlack}
        disabled={!myTurn || placing}
        placing={placing}
        onCellClick={handleCell}
      />

      {isSpectator && !finished && (
        <p className="text-center text-xs text-folk-cobalt">
          관전 중 — {turnName} ({turn === "black" ? "흑" : "백"})의 턴
        </p>
      )}
    </div>
  );
}
