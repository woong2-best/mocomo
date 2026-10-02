"use client";

import { useState } from "react";
import { Flag, Timer } from "lucide-react";
import { JanggiBoard } from "@/components/janggi/janggi-board";
import { Button } from "@/components/ui/button";
import type { JanggiBoard as JanggiBoardType, JanggiMove } from "@/lib/minigames/janggi-logic";
import { JANGGI_TURN_MS, resolveJanggiMyRed, shouldFlipJanggiBoard } from "@/lib/minigames/janggi-logic";
import type { MinigamePlayerPublic } from "@/lib/minigames/shared-types";
import { cn } from "@/lib/utils";

type Props = {
  board: JanggiBoardType;
  turnRed: boolean;
  turnUserId: string | null;
  redUserId: string;
  blueUserId: string;
  lastMove: JanggiMove | null;
  checkRed: boolean;
  checkBlue: boolean;
  timeLeft: number;
  turnLimit: number;
  userId?: string;
  isSpectator: boolean;
  finished?: boolean;
  players: MinigamePlayerPublic[];
  onMove: (move: JanggiMove) => Promise<boolean>;
  onResign?: () => void | Promise<boolean>;
};

function playerName(players: MinigamePlayerPublic[], id: string) {
  return players.find((p) => p.userId === id)?.username ?? "플레이어";
}

export function JanggiGamePanel({
  board,
  turnRed,
  turnUserId,
  redUserId,
  blueUserId,
  lastMove,
  checkRed,
  checkBlue,
  timeLeft,
  turnLimit,
  userId,
  isSpectator,
  finished,
  players,
  onMove,
  onResign,
}: Props) {
  const [placing, setPlacing] = useState(false);
  const myTurn = turnUserId === userId && !isSpectator && !finished;
  const mySide = resolveJanggiMyRed(userId, redUserId, blueUserId, players);
  const myRed = isSpectator ? turnRed : (mySide ?? userId === redUserId);
  // 본인 진영(초/한)이 항상 화면 아래
  const flip = !isSpectator && shouldFlipJanggiBoard(board, myRed);
  const turnName = turnUserId ? playerName(players, turnUserId) : "—";
  const pct = turnLimit > 0 ? Math.min(100, (timeLeft / turnLimit) * 100) : 0;
  const urgent = timeLeft <= 5 && !finished;
  const inCheck = (turnRed && checkRed) || (!turnRed && checkBlue);

  async function handleMove(move: JanggiMove) {
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
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-medium text-red-700">
            楚(초) {playerName(players, redUserId)}
          </span>
          <span className="text-muted-foreground">vs</span>
          <span className="font-medium text-blue-700">
            漢(한) {playerName(players, blueUserId)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Timer className={cn("h-4 w-4", urgent && "text-red-600 animate-pulse")} />
          <span className={cn(urgent && "text-red-600 font-semibold")}>
            {finished ? "종료" : `${turnName} 턴 · ${timeLeft}초`}
          </span>
          {inCheck && !finished && (
            <span className="ml-1 rounded-md bg-red-600 px-2 py-0.5 text-xs font-bold text-white animate-pulse">
              장군!
            </span>
          )}
          {placing && (
            <span className="text-xs text-muted-foreground">서버 확인 중…</span>
          )}
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full transition-all", urgent ? "bg-red-500" : "bg-folk-cobalt")}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <JanggiBoard
        board={board}
        turnRed={turnRed}
        myRed={myRed}
        lastMove={lastMove}
        checkRed={checkRed}
        checkBlue={checkBlue}
        disabled={!myTurn || finished}
        placing={placing}
        flip={flip}
        onMove={(m) => void handleMove(m)}
      />

      <p className="text-center text-xs text-muted-foreground">
        말 클릭 → 이동 칸 클릭 · 모바일은 드래그 후 놓기
      </p>

      {myTurn && !finished && onResign && (
        <div className="flex justify-center">
          <Button type="button" variant="outline" size="sm" onClick={() => void onResign()}>
            <Flag className="h-4 w-4 mr-1" />
            기권
          </Button>
        </div>
      )}
    </div>
  );
}

export { JANGGI_TURN_MS };
