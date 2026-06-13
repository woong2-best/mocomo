"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  boardToCell,
  computeGoBoardLayout,
  drawBoardStone,
  drawGoBoardSurface,
} from "@/lib/minigames/go-board-art";
import { badukPlaySize, type Stone } from "@/lib/minigames/baduk-logic";
import { cn } from "@/lib/utils";

type Props = {
  board: Stone[][];
  boardSize: number;
  lastMove?: { x: number; y: number } | null;
  myStoneBlack?: boolean;
  disabled?: boolean;
  placing?: boolean;
  onCellClick?: (x: number, y: number) => void;
};

export function BadukBoard({
  board,
  boardSize,
  lastMove,
  myStoneBlack = true,
  disabled,
  placing,
  onCellClick,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const playSize = badukPlaySize(boardSize);
  const maxW = playSize + 72;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = wrap.getBoundingClientRect();
    const cssW = Math.min(rect.width, maxW);
    const cssH = cssW;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const layout = computeGoBoardLayout(cssW, cssH, boardSize, playSize);
    drawGoBoardSurface(ctx, layout);

    for (let y = 0; y < boardSize; y++) {
      for (let x = 0; x < boardSize; x++) {
        const cell = board[y]?.[x] ?? 0;
        if (cell === 0) continue;
        const isLast = lastMove?.x === x && lastMove?.y === y;
        drawBoardStone(ctx, layout, x, y, cell === 1, { last: isLast });
      }
    }

    if (!disabled && !placing && hover && board[hover.y]?.[hover.x] === 0) {
      drawBoardStone(ctx, layout, hover.x, hover.y, myStoneBlack, { preview: true });
    }
  }, [board, boardSize, disabled, hover, lastMove, maxW, myStoneBlack, placing, playSize]);

  useEffect(() => {
    draw();
    const ro = new ResizeObserver(draw);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [draw]);

  function pointerPos(e: React.PointerEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const cssW = parseFloat(canvas.style.width) || rect.width;
    const layout = computeGoBoardLayout(cssW, cssW, boardSize, playSize);
    return boardToCell(layout, e.clientX - rect.left, e.clientY - rect.top);
  }

  return (
    <div
      ref={wrapRef}
      className={cn("mx-auto w-full touch-none select-none", !disabled && !placing && "cursor-pointer")}
      style={{ maxWidth: maxW + 24 }}
    >
      <canvas
        ref={canvasRef}
        className="w-full rounded-2xl shadow-2xl ring-1 ring-black/20"
        onPointerMove={(e) => {
          if (disabled || placing) {
            setHover(null);
            return;
          }
          setHover(pointerPos(e));
        }}
        onPointerLeave={() => setHover(null)}
        onPointerDown={(e) => {
          if (disabled || placing) return;
          const cell = pointerPos(e);
          if (!cell || board[cell.y]?.[cell.x] !== 0) return;
          onCellClick?.(cell.x, cell.y);
        }}
      />
    </div>
  );
}
