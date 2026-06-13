"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Timer } from "lucide-react";
import {
  ALKKAGI_BOARD_H,
  ALKKAGI_BOARD_W,
  ALKKAGI_MAX_PULL,
  ALKKAGI_STONE_R,
  powerColor,
  simulateAlkkagiShot,
  type AlkkagiStone,
} from "@/lib/minigames/alkkagi-physics";
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
  phase,
  lastKnockouts,
  lastShooterId,
  lastShot,
  players,
  onMove,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [displayStones, setDisplayStones] = useState(stones);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [flashMsg, setFlashMsg] = useState<string | null>(null);
  const lastShotSeq = useRef(0);
  const prevStonesRef = useRef(stones);
  const animRef = useRef<number | null>(null);

  const myTurn = turnUserId === userId && !isSpectator && !animating;
  const scale = useRef(1);

  const boardToScreen = useCallback((bx: number, by: number, canvasW: number, canvasH: number) => {
    const s = Math.min(canvasW / width, canvasH / height);
    const ox = (canvasW - width * s) / 2;
    const oy = (canvasH - height * s) / 2;
    return { x: ox + bx * s, y: oy + by * s, s };
  }, [width, height]);

  const screenToBoard = useCallback(
    (sx: number, sy: number, canvasW: number, canvasH: number) => {
      const s = Math.min(canvasW / width, canvasH / height);
      const ox = (canvasW - width * s) / 2;
      const oy = (canvasH - height * s) / 2;
      return { x: (sx - ox) / s, y: (sy - oy) / s, s };
    },
    [width, height]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = wrap.getBoundingClientRect();
    const cssW = Math.min(rect.width, 560);
    const cssH = cssW;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const { s } = boardToScreen(0, 0, cssW, cssH);
    scale.current = s;
    const ox = (cssW - width * s) / 2;
    const oy = (cssH - height * s) / 2;

    // board
    ctx.save();
    ctx.fillStyle = "#c4a574";
    ctx.strokeStyle = "#5c3d1e";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(ox, oy, width * s, height * s, 8);
    ctx.fill();
    ctx.stroke();

    // center line hint
    ctx.strokeStyle = "rgba(92,61,30,0.25)";
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(ox + (width * s) / 2, oy);
    ctx.lineTo(ox + (width * s) / 2, oy + height * s);
    ctx.stroke();
    ctx.setLineDash([]);

    // rubber band
    if (drag && myTurn) {
      const stone = displayStones.find((st) => st.id === drag.stoneId);
      if (stone) {
        const sx = ox + stone.x * s;
        const sy = oy + stone.y * s;
        const dx = drag.pullX - drag.startX;
        const dy = drag.pullY - drag.startY;
        const pullDist = Math.min(Math.hypot(dx, dy), ALKKAGI_MAX_PULL * s);
        const power = pullDist / (ALKKAGI_MAX_PULL * s);
        const angle = Math.atan2(-dy, -dx);
        const bandEndX = sx - Math.cos(angle) * pullDist;
        const bandEndY = sy - Math.sin(angle) * pullDist;

        ctx.strokeStyle = powerColor(power);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(bandEndX, bandEndY);
        ctx.stroke();

        ctx.fillStyle = powerColor(power);
        ctx.beginPath();
        ctx.arc(bandEndX, bandEndY, 5, 0, Math.PI * 2);
        ctx.fill();

        // aim arrow
        const arrowLen = 24 + power * 40;
        ctx.strokeStyle = powerColor(power);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + Math.cos(angle) * arrowLen, sy + Math.sin(angle) * arrowLen);
        ctx.stroke();
      }
    }

    // stones
    for (const stone of displayStones) {
      const sx = ox + stone.x * s;
      const sy = oy + stone.y * s;
      const r = ALKKAGI_STONE_R * s;
      const mine = stone.ownerId === userId;

      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fillStyle = mine ? "#1a1a1a" : "#f5f5f4";
      ctx.fill();
      ctx.strokeStyle = mine ? "#fafafa" : "#737373";
      ctx.lineWidth = selectedId === stone.id ? 3 : 2;
      ctx.stroke();

      if (selectedId === stone.id) {
        ctx.strokeStyle = "#e07a5f";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sx, sy, r + 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = mine ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)";
      ctx.beginPath();
      ctx.arc(sx - r * 0.25, sy - r * 0.25, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }, [boardToScreen, displayStones, drag, height, myTurn, selectedId, userId, width]);

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
          setDisplayStones(result.stones);
          setAnimating(false);
          setSelectedId(null);
          return;
        }
        setDisplayStones(frames[i]!);
        i += 1;
        animRef.current = requestAnimationFrame(() => {
          setTimeout(step, 16);
        });
      };
      step();
    },
    [height, width]
  );

  // sync stones when not animating
  useEffect(() => {
    if (!animating) setDisplayStones(stones);
  }, [stones, animating]);

  // remote shot animation (pre-shot stones kept in prevStonesRef)
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
    for (const s of displayStones) {
      if (Math.hypot(s.x - bx, s.y - by) <= ALKKAGI_STONE_R * 1.2) return s;
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
    const base = displayStones;
    runAnimation(base, drag.stoneId, angle, power);
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
          {players.slice(0, 2).map((p) => (
            <span key={p.userId}>
              {p.username}: {stoneCounts[p.userId] ?? 0}알 · {scores[p.userId] ?? 0}점
            </span>
          ))}
        </div>
      </div>

      {flashMsg && (
        <p className="text-center text-sm font-bold text-folk-terracotta animate-pulse">{flashMsg}</p>
      )}

      {showHint && myTurn && (
        <p className="text-center text-xs text-muted-foreground">
          내 알을 터치한 뒤 반대 방향으로 당겨 놓으면 발사됩니다
        </p>
      )}

      <div
        ref={wrapRef}
        className={cn(
          "mx-auto w-full max-w-[560px] touch-none select-none",
          myTurn ? "cursor-crosshair" : "cursor-default"
        )}
      >
        <canvas
          ref={canvasRef}
          className="w-full rounded-xl shadow-md border-2 border-amber-900/40"
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
