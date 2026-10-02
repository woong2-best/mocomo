"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  JANGGI_CANVAS_SIZE,
  computeJanggiLayout,
  drawJanggiBoardSurface,
  drawJanggiScene,
  janggiCoordFromPointer,
} from "@/lib/minigames/janggi-board-art";
import { measureCanvasCssSize } from "@/lib/minigames/go-board-art";
import {
  type JanggiBoard,
  type JanggiCoord,
  type JanggiMove,
  type JanggiPiece,
  getLegalMoves,
  isRedPiece,
} from "@/lib/minigames/janggi-logic";
import { cn } from "@/lib/utils";

const BOARD_MAX_CSS = JANGGI_CANVAS_SIZE + 24;

type Props = {
  board: JanggiBoard;
  turnRed: boolean;
  myRed?: boolean;
  lastMove?: JanggiMove | null;
  checkRed?: boolean;
  checkBlue?: boolean;
  disabled?: boolean;
  placing?: boolean;
  flip?: boolean;
  onMove?: (move: JanggiMove) => void;
};

function flipCoord(c: JanggiCoord, flip: boolean): JanggiCoord {
  if (!flip) return c;
  return { x: 8 - c.x, y: 9 - c.y };
}

function unflipCoord(c: JanggiCoord, flip: boolean): JanggiCoord {
  return flipCoord(c, flip);
}

export function JanggiBoard({
  board,
  turnRed,
  myRed = true,
  lastMove,
  checkRed,
  checkBlue,
  disabled,
  placing,
  flip = false,
  onMove,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<JanggiCoord | null>(null);
  const [legalMoves, setLegalMoves] = useState<JanggiCoord[]>([]);
  const dragFrom = useRef<JanggiCoord | null>(null);

  const displayBoard = flip
    ? board
        .slice()
        .reverse()
        .map((row) => row.slice().reverse()) as JanggiBoard
    : board;

  const displayLast = lastMove
    ? flip
      ? {
          fromX: 8 - lastMove.fromX,
          fromY: 9 - lastMove.fromY,
          toX: 8 - lastMove.toX,
          toY: 9 - lastMove.toY,
        }
      : lastMove
    : null;

  const displaySelected = selected ? flipCoord(selected, flip) : null;
  const displayLegalMoves = legalMoves.map((m) => flipCoord(m, flip));

  const checkKing = (() => {
    if (checkRed) {
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 9; x++) {
          if (board[y]?.[x] === "rK") return flip ? flipCoord({ x, y }, flip) : { x, y };
        }
      }
    }
    if (checkBlue) {
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 9; x++) {
          if (board[y]?.[x] === "bK") return flip ? flipCoord({ x, y }, flip) : { x, y };
        }
      }
    }
    return null;
  })();

  useEffect(() => {
    setSelected(null);
    setLegalMoves([]);
  }, [turnRed, disabled]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const dpr = window.devicePixelRatio || 1;
    const cssW = measureCanvasCssSize(wrap, BOARD_MAX_CSS);
    const cssH = cssW * (10 / 9);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const grad = ctx.createLinearGradient(0, 0, cssW, cssH);
    grad.addColorStop(0, "#e8c890");
    grad.addColorStop(1, "#c9a066");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cssW, cssH);

    const layout = computeJanggiLayout(cssW, cssH);
    drawJanggiBoardSurface(ctx, layout, flip);
    drawJanggiScene(ctx, layout, displayBoard, {
      selected: displaySelected,
      legalMoves: displayLegalMoves,
      lastMove: displayLast,
      checkKing,
    });
  }, [checkKing, displayBoard, displayLast, displayLegalMoves, displaySelected, flip, legalMoves, selected]);

  useLayoutEffect(() => {
    draw();
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(wrap);
    const onWinResize = () => draw();
    window.addEventListener("resize", onWinResize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onWinResize);
    };
  }, [draw]);

  function pickPiece(x: number, y: number): JanggiPiece | null {
    return board[y]?.[x] ?? null;
  }

  function trySelect(x: number, y: number) {
    const piece = pickPiece(x, y);
    if (!piece || isRedPiece(piece) !== myRed) {
      setSelected(null);
      setLegalMoves([]);
      return;
    }
    setSelected({ x, y });
    setLegalMoves(getLegalMoves(board, x, y));
  }

  function tryMove(toX: number, toY: number) {
    if (!selected || disabled || placing) return;
    const hit = legalMoves.some((m) => m.x === toX && m.y === toY);
    if (!hit) {
      trySelect(toX, toY);
      return;
    }
    onMove?.({ fromX: selected.x, fromY: selected.y, toX, toY });
    setSelected(null);
    setLegalMoves([]);
  }

  function handlePointer(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    if (!canvas || disabled || placing) return;
    const rect = canvas.getBoundingClientRect();
    const cssW = parseFloat(canvas.style.width) || rect.width;
    const cssH = parseFloat(canvas.style.height) || rect.height;
    const layout = computeJanggiLayout(cssW, cssH);
    const coord = janggiCoordFromPointer(layout, clientX, clientY, rect);
    if (!coord) return;
    const logical = unflipCoord(coord, flip);
    if (!selected) trySelect(logical.x, logical.y);
    else tryMove(logical.x, logical.y);
  }

  return (
    <div
      ref={wrapRef}
      className={cn("w-full max-w-[440px] mx-auto aspect-[9/10]", placing && "opacity-80")}
    >
      <canvas
        ref={canvasRef}
        className={cn(
          "block w-full h-full rounded-lg border-2 border-amber-900/30 shadow-md touch-none",
          disabled ? "cursor-not-allowed" : "cursor-pointer"
        )}
        onClick={(e) => handlePointer(e.clientX, e.clientY)}
        onPointerDown={(e) => {
          if (disabled || placing) return;
          const canvas = canvasRef.current;
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          const cssW = parseFloat(canvas.style.width) || rect.width;
          const cssH = parseFloat(canvas.style.height) || rect.height;
          const layout = computeJanggiLayout(cssW, cssH);
          const coord = janggiCoordFromPointer(layout, e.clientX, e.clientY, rect);
          if (!coord) return;
          const logical = unflipCoord(coord, flip);
          const piece = pickPiece(logical.x, logical.y);
          if (piece && isRedPiece(piece) === myRed) {
            dragFrom.current = logical;
            trySelect(logical.x, logical.y);
          }
        }}
        onPointerUp={(e) => {
          if (!dragFrom.current || disabled || placing) return;
          const canvas = canvasRef.current;
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          const cssW = parseFloat(canvas.style.width) || rect.width;
          const cssH = parseFloat(canvas.style.height) || rect.height;
          const layout = computeJanggiLayout(cssW, cssH);
          const coord = janggiCoordFromPointer(layout, e.clientX, e.clientY, rect);
          dragFrom.current = null;
          if (!coord) return;
          const logical = unflipCoord(coord, flip);
          tryMove(logical.x, logical.y);
        }}
      />
    </div>
  );
}
