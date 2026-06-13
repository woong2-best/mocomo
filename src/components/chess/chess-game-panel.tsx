"use client";

import { useState } from "react";
import { Flag, Handshake, Timer, X } from "lucide-react";
import { ChessBoard } from "@/components/chess/chess-board";
import { Button } from "@/components/ui/button";
import {
  CHESS_TURN_MS,
  fiftyMoveInfo,
  type ChessMoveInput,
  type ChessSideMove,
} from "@/lib/minigames/chess-logic";
import type { MinigamePlayerPublic } from "@/lib/minigames/shared-types";
import { cn } from "@/lib/utils";

type Props = {
  fen: string;
  turnUserId: string | null;
  whiteUserId: string;
  blackUserId: string;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  lastMove: { from: string; to: string; san?: string } | null;
  halfmoveClock: number;
  drawOfferFrom: string | null;
  useTurnTimer: boolean;
  timeLeft: number;
  turnLimit: number;
  pgn: string[];
  userId?: string;
  isSpectator: boolean;
  finished?: boolean;
  players: MinigamePlayerPublic[];
  onMove: (move: ChessSideMove) => Promise<boolean>;
};

function playerName(players: MinigamePlayerPublic[], id: string) {
  return players.find((p) => p.userId === id)?.username ?? "플레이어";
}

export function ChessGamePanel({
  fen,
  turnUserId,
  whiteUserId,
  blackUserId,
  isCheck,
  isCheckmate,
  isStalemate,
  isDraw,
  lastMove,
  halfmoveClock,
  drawOfferFrom,
  useTurnTimer,
  timeLeft,
  turnLimit,
  pgn,
  userId,
  isSpectator,
  finished,
  players,
  onMove,
}: Props) {
  const [placing, setPlacing] = useState(false);
  const myTurn = turnUserId === userId && !isSpectator && !finished;
  const iAmWhite = userId === whiteUserId;
  const iAmBlack = userId === blackUserId;
  const iAmPlayer = iAmWhite || iAmBlack;
  const orientation = iAmWhite ? "white" : "black";
  const turnName = turnUserId ? playerName(players, turnUserId) : "—";
  const pct = turnLimit > 0 ? Math.min(100, (timeLeft / turnLimit) * 100) : 0;
  const urgent = useTurnTimer && timeLeft <= 10 && !finished;
  const fifty = fiftyMoveInfo(halfmoveClock);
  const drawOfferName = drawOfferFrom ? playerName(players, drawOfferFrom) : null;
  const drawOfferToMe = drawOfferFrom && userId && drawOfferFrom !== userId && iAmPlayer;

  async function play(move: ChessSideMove) {
    if (!myTurn && !("resign" in move) && !("acceptDraw" in move) && !("declineDraw" in move)) return;
    if ("resign" in move && !iAmPlayer) return;
    if (("drawOffer" in move || ("acceptDraw" in move && !drawOfferToMe) || ("declineDraw" in move && !drawOfferToMe)) && !iAmPlayer) {
      return;
    }
    setPlacing(true);
    try {
      await onMove(move);
    } finally {
      setPlacing(false);
    }
  }

  const statusLabel = finished
    ? isCheckmate
      ? "체크메이트"
      : isStalemate
        ? "스테일메이트"
        : isDraw
          ? "무승부"
          : "종료"
    : isCheck
      ? "체크!"
      : myTurn
        ? "내 턴"
        : `${turnName} 턴`;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border-2 border-folk-cobalt/20 bg-folk-gold/10 px-4 py-3 space-y-2">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span>백 {playerName(players, whiteUserId)}</span>
          <span className="text-muted-foreground">vs</span>
          <span>흑 {playerName(players, blackUserId)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {useTurnTimer && <Timer className={cn("h-4 w-4", urgent && "text-red-600 animate-pulse")} />}
          <span
            className={cn(
              urgent && "text-red-600 font-semibold",
              isCheck && !finished && "text-red-700 font-bold"
            )}
          >
            {statusLabel}
            {useTurnTimer && !finished && ` · ${timeLeft}초`}
          </span>
          {lastMove?.san && (
            <span className="text-xs text-muted-foreground">마지막 수 {lastMove.san}</span>
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

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>50수 규칙 (반수)</span>
            <span className={cn(fifty.warning && !finished && "text-amber-700 font-semibold")}>
              {fifty.halfmove} / {fifty.limit}
            </span>
          </div>
          <div className="h-1 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full transition-all",
                fifty.warning ? "bg-amber-500" : "bg-muted-foreground/40"
              )}
              style={{ width: `${Math.min(100, (fifty.halfmove / fifty.limit) * 100)}%` }}
            />
          </div>
          {fifty.warning && !finished && (
            <p className="text-[11px] text-amber-700">포획·폰 전진 없이 {fifty.limit - fifty.halfmove}반수 남음</p>
          )}
        </div>

        {drawOfferFrom && !finished && (
          <div className="rounded-lg border border-amber-300/60 bg-amber-50/80 px-3 py-2 text-xs flex flex-wrap items-center gap-2">
            <Handshake className="h-3.5 w-3.5 text-amber-700" />
            <span>{drawOfferName}님이 무승부를 제안했습니다.</span>
            {drawOfferToMe && (
              <>
                <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => void play({ acceptDraw: true })}>
                  수락
                </Button>
                <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => void play({ declineDraw: true })}>
                  <X className="h-3 w-3 mr-0.5" />
                  거절
                </Button>
              </>
            )}
          </div>
        )}

        {pgn.length > 0 && (
          <p className="text-xs text-muted-foreground truncate" title={pgn.join(" ")}>
            {pgn.slice(-12).join(" ")}
          </p>
        )}
      </div>

      <ChessBoard
        fen={fen}
        orientation={isSpectator ? "white" : orientation}
        lastMove={lastMove}
        inCheck={isCheck && !finished}
        disabled={!myTurn || finished}
        placing={placing}
        showCoordinates
        onMove={(m) => void play(m)}
      />

      <p className="text-center text-xs text-muted-foreground">
        a1~h8 좌표 · 말 클릭 → 이동 · FIDE 규칙 (캐슬·앙파상·프로모션)
      </p>

      {iAmPlayer && !finished && (
        <div className="flex flex-wrap justify-center gap-2">
          {myTurn && (
            <Button type="button" variant="outline" size="sm" onClick={() => void play({ drawOffer: true })}>
              <Handshake className="h-4 w-4 mr-1" />
              무승부 제안
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

export { CHESS_TURN_MS };
