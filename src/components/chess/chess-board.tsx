"use client";

import { useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import {
  getLegalTargets,
  isPromotionMove,
  pieceUnicode,
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

  const grid = (
    <div
      className={cn(
        "grid grid-cols-8 border-2 border-amber-900/40 rounded-lg overflow-hidden shadow-lg",
        (disabled || placing) && "opacity-90"
      )}
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
                "relative w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center text-2xl select-none touch-none",
                light ? "bg-amber-100" : "bg-amber-700/45",
                isSelected && "ring-2 ring-inset ring-orange-500",
                isLast && "bg-emerald-200/60",
                isKingCheck && "bg-red-300/70 ring-2 ring-red-600"
              )}
            >
              {showCoordinates && (
                <span
                  className={cn(
                    "absolute bottom-0.5 right-0.5 text-[9px] font-mono leading-none pointer-events-none",
                    light ? "text-amber-800/55" : "text-amber-100/70"
                  )}
                >
                  {sq}
                </span>
              )}
              {cell ? (
                <span
                  className={cn(
                    "leading-none drop-shadow-sm",
                    cell.color === "w" ? "text-neutral-100" : "text-neutral-900"
                  )}
                >
                  {pieceUnicode(cell.color, cell.type)}
                </span>
              ) : null}
              {isTarget && !cell && (
                <span className="absolute w-3 h-3 rounded-full bg-emerald-600/50" />
              )}
              {isTarget && cell && (
                <span className="absolute inset-1 rounded-full ring-2 ring-red-500/70" />
              )}
            </button>
          );
        })
      )}
    </div>
  );

  if (!showCoordinates) {
    return (
      <div className="relative mx-auto w-fit">
        {grid}
        {pending && <PromotionModal pending={pending} onPick={submitMove} onCancel={() => setPending(null)} />}
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-fit">
      <div className="flex items-stretch gap-1">
        <div className="flex flex-col justify-around py-0.5 text-[10px] font-mono text-muted-foreground w-4">
          {Array.from({ length: 8 }, (_, r) => (
            <span key={r} className="h-10 sm:h-11 flex items-center justify-center">
              {rankLabel(r, flip)}
            </span>
          ))}
        </div>
        {grid}
      </div>
      <div className="flex pl-5 mt-1">
        {Array.from({ length: 8 }, (_, f) => (
          <span
            key={f}
            className="w-10 sm:w-11 text-center text-[10px] font-mono text-muted-foreground"
          >
            {fileLabel(f, flip)}
          </span>
        ))}
      </div>

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
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 rounded-lg">
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
