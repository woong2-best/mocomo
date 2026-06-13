"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Timer } from "lucide-react";
import {
  ALKKAGI_CANVAS_SIZE,
  ALKKAGI_MAX_PULL,
  ALKKAGI_STONE_R,
  simulateAlkkagiShot,
  type AlkkagiFrame,
  type AlkkagiStone,
} from "@/lib/minigames/alkkagi-physics";
import {
  computeBoardLayout,
  drawAlkkagiBoardSurface,
  drawGoStone,
  drawRubberBand,
  stoneScreenPos,
} from "@/lib/minigames/alkkagi-board-art";
import type { MinigamePlayerPublic } from "@/lib/minigames/shared-types";
import { cn } from "@/lib/utils";

type LastShot = {
  stoneId: string;
  angle: number;
  power: number;
  shooterId: string;
  seq: number;
};

type Props = {
  stones: AlkkagiStone[];
  turnUserId: string;
  userId?: string;
  isSpectator: boolean;
  width: number;
  height: number;
  scores: Record<string, number>;
  stoneCounts: Record<string, number>;
  timeLeft: number;
  turnLimit: number;
  phase: string;
  lastKnockouts: number;
  lastShooterId: string | null;
  lastShot: LastShot | null;
  blackPlayerId: string | null;
  whitePlayerId: string | null;
  players: MinigamePlayerPublic[];
  onMove: (move: { stoneId: string; angle: number; power: number }) => Promise<boolean>;
};

type DragState = {
  stoneId: string;
  startX: number;
  startY: number;
  pullX: number;
  pullY: number;
};

function playerName(players: MinigamePlayerPublic[], id: string) {
  return players.find((p) => p.userId === id)?.username ?? "플레이어";
}

export function AlkkagiBoard({
  stones,
  turnUserId,
  userId,
  isSpectator,
  width,
  height,
  scores,
  stoneCounts,
  timeLeft,
  turnLimit,
  lastKnockouts,
  lastShooterId,
  lastShot,
  blackPlayerId,
  whitePlayerId,
  players,
  onMove,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [displayFrame, setDisplayFrame] = useState<AlkkagiFrame>({ onBoard: stones, falling: [] });
  const [drag, setDrag] = useState<DragState | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [flashMsg, setFlashMsg] = useState<string | null>(null);
  const lastShotSeq = useRef(0);
  const prevStonesRef = useRef(stones);
  const animRef = useRef<number | null>(null);
  const layoutRef = useRef(computeBoardLayout(560, 560, width, height));

  const myTurn = turnUserId === userId && !isSpectator && !animating;
  const iAmBlack = userId != null && userId === blackPlayerId;
  const iAmWhite = userId != null && userId === whitePlayerId;
  const myColorLabel = iAmBlack ? "흑" : iAmWhite ? "백" : null;

  const isBlackStone = useCallback(
    (ownerId: string) => (blackPlayerId ? ownerId === blackPlayerId : ownerId === userId),
    [blackPlayerId, userId]
  );

  const screenToBoard = useCallback(
    (sx: number, sy: number, canvasW: number, canvasH: number) => {
      const layout = computeBoardLayout(canvasW, canvasH, width, height);
      layoutRef.current = layout;
      return {
        x: (sx - layout.ox) / layout.s,
        y: (sy - layout.oy) / layout.s,
      };
    },
    [width, height]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = wrap.getBoundingClientRect();
    const cssW = Math.min(rect.width, 600);
    const cssH = cssW;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const layout = computeBoardLayout(cssW, cssH, width, height);
    layoutRef.current = layout;

    // felt table background
    ctx.fillStyle = "#2a4a3a";
    ctx.fillRect(0, 0, cssW, cssH);
    const felt = ctx.createRadialGradient(cssW / 2, cssH / 2, 0, cssW / 2, cssH / 2, cssW * 0.7);
    felt.addColorStop(0, "#3d6b52");
    felt.addColorStop(1, "#1e3328");
    ctx.fillStyle = felt;
    ctx.fillRect(0, 0, cssW, cssH);

    drawAlkkagiBoardSurface(ctx, layout, width, height);

    if (drag && myTurn) {
      const stone = displayFrame.onBoard.find((st) => st.id === drag.stoneId);
      if (stone) {
        const { x: sx, y: sy } = stoneScreenPos(stone, layout);
        const dx = drag.pullX - drag.startX;
        const dy = drag.pullY - drag.startY;
        const pullDist = Math.min(Math.hypot(dx, dy), ALKKAGI_MAX_PULL * layout.s);
        const power = pullDist / (ALKKAGI_MAX_PULL * layout.s);
        const angle = Math.atan2(-dy, -dx);
        drawRubberBand(ctx, sx, sy, pullDist, angle, power);
      }
    }

    for (const stone of displayFrame.onBoard) {
      const { x, y, r } = stoneScreenPos(stone, layout);
      drawGoStone(ctx, x, y, r, isBlackStone(stone.ownerId), selectedId === stone.id);
    }

    for (const stone of displayFrame.falling) {
      const { x, y, r } = stoneScreenPos(stone, layout);
      const offDist = Math.max(
        Math.max(0, -stone.x),
        Math.max(0, stone.x - width),
        Math.max(0, -stone.y),
        Math.max(0, stone.y - height)
      );
      const fade = Math.max(0.12, 1 - offDist / (width * 0.45));
      drawGoStone(ctx, x, y, r, isBlackStone(stone.ownerId), false, fade);
    }
  }, [displayFrame, drag, height, isBlackStone, myTurn, selectedId, width]);

  useEffect(() => {
    draw();
    const ro = new ResizeObserver(draw);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [draw]);

  const runAnimation = useCallback(
    (baseStones: AlkkagiStone[], stoneId: string, angle: number, power: number) => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      const result = simulateAlkkagiShot(baseStones, stoneId, angle, power, width, height);
      const frames = result.frames;
      let i = 0;
      setAnimating(true);

      const step = () => {
        if (i >= frames.length) {
          setDisplayFrame({ onBoard: result.stones, falling: [] });
          setAnimating(false);
          setSelectedId(null);
          return;
        }
        setDisplayFrame(frames[i]!);
        i += 1;
        animRef.current = requestAnimationFrame(() => {
          setTimeout(step, 14);
        });
      };
      step();
    },
    [height, width]
  );

  useEffect(() => {
    if (!animating) {
      setDisplayFrame({ onBoard: stones, falling: [] });
    }
  }, [stones, animating]);

  useEffect(() => {
    if (!lastShot || lastShot.seq === lastShotSeq.current) {
      prevStonesRef.current = stones;
      return;
    }

    lastShotSeq.current = lastShot.seq;
    const base = prevStonesRef.current;

    if (lastKnockouts >= 2) {
      setFlashMsg(`${lastKnockouts}개 한 방에 OUT! +${lastKnockouts + lastKnockouts - 1}점`);
    } else if (lastKnockouts === 1) {
      setFlashMsg("상대 알 OUT!");
    } else if (lastShooterId === userId) {
      setFlashMsg("발사!");
    } else {
      setFlashMsg("상대 발사!");
    }
    const t = setTimeout(() => setFlashMsg(null), 1800);

    if (lastShot.shooterId !== userId) {
      runAnimation(base, lastShot.stoneId, lastShot.angle, lastShot.power);
    }

    prevStonesRef.current = stones;
    return () => clearTimeout(t);
  }, [lastShot, lastKnockouts, lastShooterId, stones, userId, runAnimation]);

  function hitStone(bx: number, by: number): AlkkagiStone | null {
    for (const s of displayFrame.onBoard) {
      if (Math.hypot(s.x - bx, s.y - by) <= ALKKAGI_STONE_R * 1.35) return s;
    }
    return null;
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!myTurn) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const { x, y } = screenToBoard(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
    const stone = hitStone(x, y);
    if (!stone || stone.ownerId !== userId) return;
    setShowHint(false);
    setSelectedId(stone.id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({
      stoneId: stone.id,
      startX: e.clientX,
      startY: e.clientY,
      pullX: e.clientX,
      pullY: e.clientY,
    });
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag) return;
    setDrag((d) => (d ? { ...d, pullX: e.clientX, pullY: e.clientY } : null));
  }

  async function onPointerUp() {
    if (!drag || !myTurn) {
      setDrag(null);
      return;
    }
    const dx = drag.pullX - drag.startX;
    const dy = drag.pullY - drag.startY;
    const pullDist = Math.min(Math.hypot(dx, dy), ALKKAGI_MAX_PULL);
    const power = pullDist / ALKKAGI_MAX_PULL;

    setDrag(null);

    if (power < 0.05) {
      setSelectedId(null);
      return;
    }

    const angle = Math.atan2(-dy, -dx);
    runAnimation(displayFrame.onBoard, drag.stoneId, angle, power);
    await onMove({ stoneId: drag.stoneId, angle, power });
  }

  const turnName = playerName(players, turnUserId);
  const pct = turnLimit > 0 ? Math.min(100, (timeLeft / turnLimit) * 100) : 0;
  const urgent = timeLeft <= 5;
  const phaseLabel = animating
    ? "RESOLVING — 돌이 멈추는 중"
    : myTurn
      ? "ACTIVE — 내 턴"
      : `WAITING — ${turnName}의 턴`;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border-2 border-folk-cobalt/20 bg-folk-gold/10 px-4 py-3 space-y-2">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span
            className={cn(
              "font-display font-bold",
              myTurn && !animating && "text-folk-terracotta",
              animating && "text-muted-foreground"
            )}
          >
            {phaseLabel}
          </span>
          <div
            className={cn(
              "flex items-center gap-1.5 tabular-nums ml-auto",
              urgent && "text-destructive animate-pulse"
            )}
          >
            <Timer className="h-4 w-4" />
            <span>{timeLeft}초</span>
          </div>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-1000 ease-linear",
              urgent ? "bg-destructive" : "bg-folk-terracotta"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          {myColorLabel && !isSpectator && (
            <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
              <span
                className={cn(
                  "inline-block w-3 h-3 rounded-full border",
                  iAmBlack ? "bg-neutral-900 border-neutral-600" : "bg-neutral-100 border-neutral-400"
                )}
              />
              내 돌: {myColorLabel}
            </span>
          )}
          {players.slice(0, 2).map((p) => {
            const color =
              p.userId === blackPlayerId ? "흑" : p.userId === whitePlayerId ? "백" : "";
            return (
              <span key={p.userId}>
                {p.username}
                {color ? ` (${color})` : ""}: {stoneCounts[p.userId] ?? 0}알 · {scores[p.userId] ?? 0}점
              </span>
            );
          })}
        </div>
      </div>

      {flashMsg && (
        <p className="text-center text-sm font-bold text-folk-terracotta animate-pulse">{flashMsg}</p>
      )}

      {showHint && myTurn && (
        <p className="text-center text-xs text-muted-foreground">
          내 돌을 당겨 놓으세요 — 상대 돌을 판 밖으로 떨어뜨리면 OUT
        </p>
      )}

      <div
        ref={wrapRef}
        className={cn(
          "mx-auto w-full touch-none select-none",
          myTurn ? "cursor-crosshair" : "cursor-default"
        )}
        style={{ maxWidth: ALKKAGI_CANVAS_SIZE + 40 }}
      >
        <canvas
          ref={canvasRef}
          className="w-full rounded-2xl shadow-2xl ring-1 ring-black/20"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => setDrag(null)}
        />
      </div>

      {isSpectator && (
        <p className="text-center text-xs text-folk-cobalt">관전 중 — {turnName}의 턴</p>
      )}
    </div>
  );
}
