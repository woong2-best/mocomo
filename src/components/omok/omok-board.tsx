"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { OMOK_BOARD_SIZE } from "@/lib/minigames/omok-logic";
import {
  boardToCell,
  computeGoBoardLayout,
  drawBoardStone,
  drawGoBoardSurface,
  drawWinLine,
  OMOK_CANVAS_SIZE,
} from "@/lib/minigames/go-board-art";
import { cn } from "@/lib/utils";

type Props = {
  board: number[][];
  lastMove?: { x: number; y: number } | null;
  winLine?: { x: number; y: number }[] | null;
  myStoneBlack?: boolean;
  disabled?: boolean;
  placing?: boolean;
  onCellClick?: (x: number, y: number) => void;
};

export function OmokBoard({
  board,
  lastMove,
  winLine,
  myStoneBlack = true,
  disabled,
  placing,
  onCellClick,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = wrap.getBoundingClientRect();
    const cssW = Math.min(rect.width, OMOK_CANVAS_SIZE + 24);
    const cssH = cssW;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const felt = ctx.createRadialGradient(cssW / 2, cssH / 2, 0, cssW / 2, cssH / 2, cssW * 0.65);
    felt.addColorStop(0, "#3d6b52");
    felt.addColorStop(1, "#1e3328");
    ctx.fillStyle = felt;
    ctx.fillRect(0, 0, cssW, cssH);

    const layout = computeGoBoardLayout(cssW, cssH);
    drawGoBoardSurface(ctx, layout);

    const winSet = new Set(winLine?.map((p) => `${p.x},${p.y}`) ?? []);

    for (let y = 0; y < OMOK_BOARD_SIZE; y++) {
      for (let x = 0; x < OMOK_BOARD_SIZE; x++) {
        const cell = board[y]?.[x] ?? 0;
        if (cell === 0) continue;
        const isLast = lastMove?.x === x && lastMove?.y === y;
        drawBoardStone(ctx, layout, x, y, cell === 1, {
          last: isLast && !winLine?.length,
          win: winSet.has(`${x},${y}`),
        });
      }
    }

    if (winLine?.length) {
      drawWinLine(ctx, layout, winLine);
    }

    if (!disabled && !placing && hover && board[hover.y]?.[hover.x] === 0) {
      drawBoardStone(ctx, layout, hover.x, hover.y, myStoneBlack, { preview: true });
    }

    if (placing && lastMove) {
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.04)";
      ctx.fillRect(0, 0, cssW, cssH);
      ctx.restore();
    }
  }, [board, disabled, hover, lastMove, myStoneBlack, placing, winLine]);

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
    const layout = computeGoBoardLayout(rect.width, rect.height);
    return boardToCell(layout, e.clientX - rect.left, e.clientY - rect.top);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (disabled || placing) {
      setHover(null);
      return;
    }
    setHover(pointerPos(e));
  }

  function onPointerLeave() {
    setHover(null);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (disabled || placing) return;
    const cell = pointerPos(e);
    if (!cell || board[cell.y]?.[cell.x] !== 0) return;
    onCellClick?.(cell.x, cell.y);
  }

  return (
    <div
      ref={wrapRef}
      className={cn("mx-auto w-full touch-none select-none", !disabled && !placing && "cursor-pointer")}
      style={{ maxWidth: OMOK_CANVAS_SIZE + 24 }}
    >
      <canvas
        ref={canvasRef}
        className="w-full rounded-2xl shadow-2xl ring-1 ring-black/20"
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onPointerDown={onPointerDown}
      />
    </div>
  );
}
