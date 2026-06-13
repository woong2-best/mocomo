"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  boardToCell,
  computeGoBoardLayout,
  drawBoardStone,
} from "@/lib/minigames/go-board-art";
import { REVERSI_SIZE } from "@/lib/minigames/reversi-logic";
import { cn } from "@/lib/utils";

const REVERSI_CELL = 36;
const REVERSI_PLAY = REVERSI_CELL * (REVERSI_SIZE - 1);
const REVERSI_CANVAS = REVERSI_PLAY + 72;

type Props = {
  board: number[][];
  validMoves?: { x: number; y: number }[];
  lastMove?: { x: number; y: number } | null;
  disabled?: boolean;
  placing?: boolean;
  onCellClick?: (x: number, y: number) => void;
};

function drawReversiSurface(ctx: CanvasRenderingContext2D, layout: ReturnType<typeof computeGoBoardLayout>, s: number) {
  const { ox, oy, playW: pw, playH: ph } = layout;
  const outerX = ox - layout.frame;
  const outerY = oy - layout.frame;
  const outerW = pw + layout.frame * 2;
  const outerH = ph + layout.frame * 2;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 14 * s;
  ctx.shadowOffsetY = 5 * s;
  ctx.fillStyle = "#1a3d2e";
  ctx.beginPath();
  ctx.roundRect(outerX, outerY, outerW, outerH, 8 * s);
  ctx.fill();
  ctx.restore();

  const felt = ctx.createRadialGradient(ox + pw / 2, oy + ph / 2, 0, ox + pw / 2, oy + ph / 2, pw * 0.65);
  felt.addColorStop(0, "#2d6b4a");
  felt.addColorStop(1, "#1a4530");
  ctx.fillStyle = felt;
  ctx.fillRect(ox, oy, pw, ph);

  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = Math.max(1, s * 0.8);
  const { cell, grid } = layout;
  for (let i = 0; i < grid; i++) {
    const gx = ox + i * cell;
    const gy = oy + i * cell;
    ctx.beginPath();
    ctx.moveTo(gx, oy);
    ctx.lineTo(gx, oy + ph);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ox, gy);
    ctx.lineTo(ox + pw, gy);
    ctx.stroke();
  }
}

function drawValidHint(
  ctx: CanvasRenderingContext2D,
  layout: ReturnType<typeof computeGoBoardLayout>,
  x: number,
  y: number,
  s: number
) {
  const { ox, oy, cell } = layout;
  const cx = ox + x * cell;
  const cy = oy + y * cell;
  const r = cell * 0.16;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = Math.max(1, s * 0.5);
  ctx.stroke();
}

export function ReversiBoard({
  board,
  validMoves = [],
  lastMove,
  disabled,
  placing,
  onCellClick,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const valid = new Set(validMoves.map((m) => `${m.x},${m.y}`));

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = wrap.getBoundingClientRect();
    const cssW = Math.min(rect.width, REVERSI_CANVAS);
    const cssH = cssW;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const layout = computeGoBoardLayout(cssW, cssH, REVERSI_SIZE, REVERSI_PLAY);
    drawReversiSurface(ctx, layout, layout.s);

    if (!disabled && !placing) {
      for (let y = 0; y < REVERSI_SIZE; y++) {
        for (let x = 0; x < REVERSI_SIZE; x++) {
          if (board[y]?.[x] !== 0) continue;
          if (valid.has(`${x},${y}`)) drawValidHint(ctx, layout, x, y, layout.s);
        }
      }
    }

    for (let y = 0; y < REVERSI_SIZE; y++) {
      for (let x = 0; x < REVERSI_SIZE; x++) {
        const cell = board[y]?.[x] ?? 0;
        if (cell === 0) continue;
        const isLast = lastMove?.x === x && lastMove?.y === y;
        drawBoardStone(ctx, layout, x, y, cell === 1, { last: isLast });
      }
    }

    if (placing) {
      ctx.fillStyle = "rgba(0,0,0,0.04)";
      ctx.fillRect(0, 0, cssW, cssH);
    }
  }, [board, disabled, lastMove, placing, valid, validMoves]);

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
    const layout = computeGoBoardLayout(cssW, cssW, REVERSI_SIZE, REVERSI_PLAY);
    return boardToCell(layout, e.clientX - rect.left, e.clientY - rect.top);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (disabled || placing) return;
    const cell = pointerPos(e);
    if (!cell) return;
    if (board[cell.y]?.[cell.x] !== 0) return;
    if (!valid.has(`${cell.x},${cell.y}`)) return;
    onCellClick?.(cell.x, cell.y);
  }

  return (
    <div
      ref={wrapRef}
      className={cn("mx-auto w-full touch-none select-none", !disabled && !placing && "cursor-pointer")}
      style={{ maxWidth: REVERSI_CANVAS + 16 }}
    >
      <canvas
        ref={canvasRef}
        className="w-full rounded-2xl shadow-2xl ring-1 ring-black/20"
        onPointerDown={onPointerDown}
      />
    </div>
  );
}
