"use client";

import { cn } from "@/lib/utils";
import { OMOK_BOARD_SIZE } from "@/lib/minigames/omok-logic";

type Props = {
  board: number[][];
  lastMove?: { x: number; y: number } | null;
  disabled?: boolean;
  onCellClick?: (x: number, y: number) => void;
  highlightUserId?: string | null;
  blackUserId?: string;
  whiteUserId?: string;
  turnUserId?: string | null;
};

export function OmokBoard({
  board,
  lastMove,
  disabled,
  onCellClick,
  turnUserId,
}: Props) {
  return (
    <div className="inline-block rounded-lg overflow-hidden border-2 border-amber-900/40 shadow-lg bg-amber-100/80 p-1">
      <div
        className="grid gap-0"
        style={{
          gridTemplateColumns: `repeat(${OMOK_BOARD_SIZE}, minmax(0, 1fr))`,
        }}
      >
        {board.map((row, y) =>
          row.map((cell, x) => {
            const isLast = lastMove?.x === x && lastMove?.y === y;
            return (
              <button
                key={`${x}-${y}`}
                type="button"
                disabled={disabled || cell !== 0}
                onClick={() => onCellClick?.(x, y)}
                className={cn(
                  "relative w-[clamp(18px,4.5vw,28px)] h-[clamp(18px,4.5vw,28px)]",
                  "border border-amber-800/20",
                  !disabled && cell === 0 && turnUserId && "hover:bg-amber-200/60 cursor-pointer",
                  disabled && "cursor-default",
                  isLast && "ring-2 ring-folk-terracotta ring-inset"
                )}
              >
                {cell === 1 && (
                  <span className="absolute inset-[12%] rounded-full bg-neutral-900 shadow-md" />
                )}
                {cell === 2 && (
                  <span className="absolute inset-[12%] rounded-full bg-white border border-neutral-300 shadow-md" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
