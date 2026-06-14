"use client";

import { useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import { ChessPieceSvg } from "@/components/chess/chess-piece-svg";
import {
  CHESS_BOARD_MAX_PX,
  CHESS_CHECK,
  CHESS_DARK,
  CHESS_FRAME,
  CHESS_FRAME_INNER,
  CHESS_LAST_MOVE,
  CHESS_LIGHT,
  CHESS_PIECE_SCALE,
  CHESS_SELECTED,
  CHESS_TARGET_EMPTY,
} from "@/lib/minigames/chess-board-art";
import {
  getLegalTargets,
  isPromotionMove,
  type ChessMoveInput,
  type ChessPromotion,
} from "@/lib/minigames/chess-logic";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  fen: string;
  orientation?: "white" | "black";
  lastMove?: { from: string; to: string } | null;
  inCheck?: boolean;
  disabled?: boolean;
  placing?: boolean;
  showCoordinates?: boolean;
  onMove: (move: ChessMoveInput) => void;
};

const PROMO_LABELS: Record<ChessPromotion, string> = {
  q: "퀸 ♕",
  r: "룩 ♖",
  b: "비숍 ♗",
  n: "나이트 ♘",
};

function squareAt(file: number, visualRank: number, flip: boolean): string {
  const f = flip ? 7 - file : file;
  const rankNum = flip ? visualRank + 1 : 8 - visualRank;
  return `${"abcdefgh"[f]}${rankNum}`;
}

function rankLabel(visualRank: number, flip: boolean): string {
  return String(flip ? visualRank + 1 : 8 - visualRank);
}

function fileLabel(file: number, flip: boolean): string {
  return "abcdefgh"[flip ? 7 - file : file] ?? "a";
}

export function ChessBoard({
  fen,
  orientation = "white",
  lastMove,
  inCheck,
  disabled,
  placing,
  showCoordinates = true,
  onMove,
}: Props) {
  const flip = orientation === "black";
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, setPending] = useState<{ from: string; to: string } | null>(null);

  const chess = useMemo(() => new Chess(fen), [fen]);
  const board = chess.board();

  const legalTargets = useMemo(() => {
    if (!selected || disabled) return new Set<string>();
    return new Set(getLegalTargets(fen, selected).map((m) => m.to));
  }, [fen, selected, disabled]);

  const kingSquare = useMemo(() => {
    if (!inCheck) return null;
    for (let visualRank = 0; visualRank < 8; visualRank++) {
      for (let file = 0; file < 8; file++) {
        const cell = cellAt(file, visualRank);
        if (cell?.type === "k" && cell.color === chess.turn()) {
          return squareAt(file, visualRank, flip);
        }
      }
    }
    return null;
  }, [board, chess, flip, inCheck, fen]);

  function cellAt(file: number, visualRank: number) {
    const row = flip ? 7 - visualRank : visualRank;
    const col = flip ? 7 - file : file;
    return board[row]?.[col] ?? null;
  }

  function trySelect(sq: string) {
    const cell = chess.get(sq as Square);
    if (!cell || cell.color !== chess.turn()) {
      setSelected(null);
      return;
    }
    setSelected(sq);
  }

  function submitMove(from: string, to: string, promotion?: ChessPromotion) {
    setSelected(null);
    setPending(null);
    onMove({ from, to, promotion });
  }

  function handleSquareClick(sq: string) {
    if (disabled || placing) return;
    if (!selected) {
      trySelect(sq);
      return;
    }
    if (sq === selected) {
      setSelected(null);
      return;
    }
    if (!legalTargets.has(sq)) {
      trySelect(sq);
      return;
    }
    if (isPromotionMove(fen, selected, sq)) {
      setPending({ from: selected, to: sq });
      return;
    }
    submitMove(selected, sq);
  }

  const squareSize = `calc(min(${CHESS_BOARD_MAX_PX}px, 92vw) / 8)`;

  const grid = (
    <div
      className={cn(
        "grid grid-cols-8 overflow-hidden rounded-[3px]",
        (disabled || placing) && "opacity-95"
      )}
      style={{ width: `calc(${squareSize} * 8)` }}
    >
      {Array.from({ length: 8 }, (_, rank) =>
        Array.from({ length: 8 }, (_, file) => {
          const sq = squareAt(file, rank, flip);
          const light = (file + rank) % 2 === 0;
          const cell = cellAt(file, rank);
          const isSelected = selected === sq;
          const isTarget = legalTargets.has(sq);
          const isLast = lastMove && (lastMove.from === sq || lastMove.to === sq);
          const isKingCheck = kingSquare === sq;

          return (
            <button
              key={sq}
              type="button"
              title={sq}
              disabled={disabled || placing}
              onClick={() => handleSquareClick(sq)}
              onPointerDown={(e) => {
                if (disabled || placing) return;
                if (cell && cell.color === chess.turn() && !selected) {
                  e.preventDefault();
                  trySelect(sq);
                }
              }}
              className={cn(
                "relative flex items-center justify-center select-none touch-none transition-colors duration-75",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-inset"
              )}
              style={{
                width: squareSize,
                height: squareSize,
                backgroundColor: light ? CHESS_LIGHT : CHESS_DARK,
                boxShadow: isSelected
                  ? `inset 0 0 0 999px ${CHESS_SELECTED}`
                  : isLast
                    ? `inset 0 0 0 999px ${CHESS_LAST_MOVE}`
                    : isKingCheck
                      ? `inset 0 0 0 999px ${CHESS_CHECK}`
                      : undefined,
              }}
            >
              {showCoordinates && file === 0 && (
                <span
                  className="absolute top-0.5 left-0.5 text-[10px] font-semibold leading-none pointer-events-none"
                  style={{ color: light ? "rgba(60,80,40,0.55)" : "rgba(255,255,255,0.5)" }}
                >
                  {rankLabel(rank, flip)}
                </span>
              )}
              {showCoordinates && rank === 7 && (
                <span
                  className="absolute bottom-0.5 right-0.5 text-[10px] font-semibold leading-none pointer-events-none"
                  style={{ color: light ? "rgba(60,80,40,0.55)" : "rgba(255,255,255,0.5)" }}
                >
                  {fileLabel(file, flip)}
                </span>
              )}

              {cell ? (
                <ChessPieceSvg
                  color={cell.color}
                  type={cell.type}
                  className="pointer-events-none"
                  style={{
                    width: `${CHESS_PIECE_SCALE * 100}%`,
                    height: `${CHESS_PIECE_SCALE * 100}%`,
                  }}
                />
              ) : null}

              {isTarget && !cell && (
                <span
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    width: "28%",
                    height: "28%",
                    backgroundColor: CHESS_TARGET_EMPTY,
                  }}
                />
              )}
              {isTarget && cell && (
                <span className="absolute inset-[8%] rounded-full pointer-events-none ring-[3px] ring-red-600/80 ring-inset" />
              )}
            </button>
          );
        })
      )}
    </div>
  );

  const boardFrame = (
    <div
      className="rounded-xl p-[6px] shadow-2xl"
      style={{
        background: `linear-gradient(145deg, ${CHESS_FRAME_INNER} 0%, ${CHESS_FRAME} 50%, #2d2118 100%)`,
        boxShadow: "0 12px 40px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.12)",
      }}
    >
      <div className="rounded-md p-[3px] bg-[#2a1f16]">{grid}</div>
    </div>
  );

  return (
    <div className="relative mx-auto w-fit max-w-full">
      {boardFrame}
      {pending && <PromotionModal pending={pending} onPick={submitMove} onCancel={() => setPending(null)} />}
    </div>
  );
}

function PromotionModal({
  pending,
  onPick,
  onCancel,
}: {
  pending: { from: string; to: string };
  onPick: (from: string, to: string, promotion?: ChessPromotion) => void;
  onCancel: () => void;
}) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 rounded-xl backdrop-blur-[2px]">
      <div className="bg-background border rounded-xl p-4 shadow-xl space-y-3 min-w-[200px]">
        <p className="text-sm font-semibold text-center">프로모션 — 기물 선택</p>
        <div className="grid grid-cols-2 gap-2">
          {(["q", "r", "b", "n"] as ChessPromotion[]).map((p) => (
            <Button
              key={p}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onPick(pending.from, pending.to, p)}
            >
              {PROMO_LABELS[p]}
            </Button>
          ))}
        </div>
        <Button type="button" variant="ghost" size="sm" className="w-full" onClick={onCancel}>
          취소
        </Button>
      </div>
    </div>
  );
}
