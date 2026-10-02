"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Crown, Layers, Timer, Trophy, Users, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  GRADE_LABELS,
  MODE_LABELS,
  RANK_TIER_LABELS,
  isTowerInstantPlayMode,
  type AccuracyGrade,
  type RankTier,
  type TowerBlock,
  type TowerMover,
  type TowerRushMode,
} from "@/lib/minigames/tower-rush-logic";
import { TOWER_MAP_THEMES } from "@/lib/minigames/tower-rush-theme";
import type { MinigamePlayerPublic } from "@/lib/minigames/shared-types";
import { cn } from "@/lib/utils";

export type TowerRushPlayerStats = {
  floor: number;
  score: number;
  combo: number;
  maxCombo: number;
  alive: boolean;
  finished: boolean;
  collapsed: boolean;
  rank: number | null;
  tier: RankTier;
  blocks: TowerBlock[];
  mover: TowerMover | null;
  lastGrade: AccuracyGrade | null;
  tilt: number;
  perfects: number;
  cameraY: number;
};

type Props = {
  mapId: string;
  mapName: string;
  mode: TowerRushMode;
  phase: "countdown" | "playing" | "finished";
  startedAt: number;
  timeLeftMs: number;
  stats: Record<string, TowerRushPlayerStats>;
  playerOrder: string[];
  finishOrder: string[];
  userId?: string;
  isSpectator: boolean;
  finished?: boolean;
  players: MinigamePlayerPublic[];
  onDrop: () => Promise<boolean>;
};

const GRADE_COLORS: Record<AccuracyGrade, string> = {
  perfect: "#fbbf24",
  great: "#34d399",
  good: "#38bdf8",
  bad: "#fb923c",
  miss: "#ef4444",
};

function drawTower(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  stats: TowerRushPlayerStats,
  mapId: string,
  gradeFlash: AccuracyGrade | null
) {
  const theme = TOWER_MAP_THEMES[mapId as keyof typeof TOWER_MAP_THEMES] ?? TOWER_MAP_THEMES.city;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, theme.skyTop);
  grad.addColorStop(1, theme.skyBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const scale = w / 100;
  const camY = stats.cameraY;
  const baseY = h * 0.88;

  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, baseY, w, h - baseY);

  ctx.strokeStyle = `${theme.accent}44`;
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const y = baseY - i * 18;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  for (const block of stats.blocks) {
    const bx = (block.x - block.width / 2) * scale;
    const bw = block.width * scale;
    const by = baseY - (block.y - camY + block.width * 0.05) * scale * 0.55;
    const bh = 12;
    ctx.fillStyle = block.color;
    ctx.shadowColor = theme.blockGlow;
    ctx.shadowBlur = 8;
    ctx.fillRect(bx, by - bh, bw, bh);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.strokeRect(bx, by - bh, bw, bh);
  }

  if (stats.mover && stats.alive) {
    const m = stats.mover;
    const mx = (m.x - m.width / 2) * scale;
    const mw = m.width * scale;
    const my = baseY - (stats.blocks[stats.blocks.length - 1]?.y ?? 0 - camY + 8) * scale * 0.55 - 28;
    ctx.fillStyle = theme.accent;
    ctx.globalAlpha = 0.92;
    ctx.fillRect(mx, my, mw, 14);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(mx, my, mw, 14);
  }

  if (gradeFlash) {
    ctx.fillStyle = `${GRADE_COLORS[gradeFlash]}22`;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = GRADE_COLORS[gradeFlash];
    ctx.font = "bold 28px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(GRADE_LABELS[gradeFlash], w / 2, h * 0.35);
  }
}

export function TowerRushGamePanel({
  mapId,
  mapName,
  mode,
  phase,
  startedAt,
  timeLeftMs,
  stats,
  playerOrder,
  finishOrder,
  userId,
  isSpectator,
  finished,
  players,
  onDrop,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const myStats = userId ? stats[userId] : undefined;
  const instantPlay = isTowerInstantPlayMode(mode);
  const canPlay = !isSpectator && !finished && phase === "playing" && !!myStats?.alive;
  const theme = TOWER_MAP_THEMES[mapId as keyof typeof TOWER_MAP_THEMES] ?? TOWER_MAP_THEMES.city;

  const [countdown, setCountdown] = useState<number | null>(null);
  const [gradeFlash, setGradeFlash] = useState<AccuracyGrade | null>(null);
  const lastGradeRef = useRef<string | null>(null);

  const watchId = isSpectator ? playerOrder[0] : userId;
  const watchStats = watchId ? stats[watchId] : myStats;

  useEffect(() => {
    if (instantPlay || phase !== "countdown") {
      setCountdown(null);
      return;
    }
    const tick = () => setCountdown(Math.max(0, Math.ceil((startedAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 80);
    return () => clearInterval(id);
  }, [phase, startedAt, instantPlay]);

  useEffect(() => {
    if (!myStats?.lastGrade) return;
    const key = `${myStats.lastGrade}-${myStats.floor}`;
    if (lastGradeRef.current === key) return;
    lastGradeRef.current = key;
    setGradeFlash(myStats.lastGrade);
    const id = window.setTimeout(() => setGradeFlash(null), 450);
    return () => window.clearTimeout(id);
  }, [myStats?.lastGrade, myStats?.floor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !watchStats) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawTower(ctx, rect.width, rect.height, watchStats, mapId, gradeFlash);
  }, [watchStats, mapId, gradeFlash]);

  const drop = useCallback(() => {
    if (!canPlay) return;
    void onDrop();
  }, [canPlay, onDrop]);

  useEffect(() => {
    if (!canPlay) return;
    function onKey(e: KeyboardEvent) {
      if (e.code === "Space") {
        e.preventDefault();
        drop();
      }
    }
    function onPointer() {
      drop();
    }
    window.addEventListener("keydown", onKey);
    const canvas = canvasRef.current;
    canvas?.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      canvas?.removeEventListener("pointerdown", onPointer);
    };
  }, [canPlay, drop]);

  const opponents = players.filter((p) => p.userId !== userId);
  const ranked = playerOrder
    .map((id) => ({ id, st: stats[id] }))
    .filter((x) => x.st)
    .sort((a, b) => (b.st!.floor - a.st!.floor) || (b.st!.score - a.st!.score));

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-slate-950/80 via-indigo-950/25 to-black/60 px-4 py-3 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-bold text-indigo-50">{mapName}</p>
            <p className="text-xs text-muted-foreground">
              {MODE_LABELS[mode]} · {theme.envLabel}
            </p>
          </div>
          <span className="rounded-lg bg-indigo-600/30 px-2 py-1 text-xs font-bold text-indigo-100 border border-indigo-400/30">
            타워 러쉬
          </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1 text-indigo-200">
            <Timer className="h-4 w-4" />
            {finished ? "종료" : phase === "countdown" && !instantPlay ? "준비…" : `${Math.ceil(timeLeftMs / 1000)}초`}
          </span>
          {myStats && (
            <>
              <span className="inline-flex items-center gap-1 font-black text-yellow-300">
                <Layers className="h-4 w-4" />
                {myStats.floor}층
              </span>
              <span className="font-black tabular-nums">{myStats.score.toLocaleString()}</span>
              <span className="text-emerald-400">{myStats.combo}c</span>
              <span className="text-violet-300">{RANK_TIER_LABELS[myStats.tier]}</span>
              {!myStats.alive && (
                <span className="text-red-400 font-bold">{myStats.collapsed ? "붕괴" : "종료"}</span>
              )}
            </>
          )}
        </div>
        {mode !== "solo" && ranked.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {ranked.slice(0, 6).map(({ id, st }, i) => (
              <div key={id} className="rounded-lg border border-white/15 bg-black/30 px-2 py-1 text-xs">
                <span className="font-semibold">{players.find((p) => p.userId === id)?.username ?? `#${i + 1}`}</span>
                <span className="ml-2 text-yellow-200">{st!.floor}층</span>
                {!st!.alive && <span className="ml-1 text-red-400">OUT</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {isSpectator && (
        <p className="text-center text-xs text-muted-foreground inline-flex items-center justify-center gap-1">
          <Users className="h-3 w-3" /> 관전 중
        </p>
      )}

      {!isSpectator && canPlay && (
        <p className="text-center text-[11px] text-indigo-200/70">
          클릭 · 터치 · <kbd className="px-1 rounded bg-black/40 border border-white/15">Space</kbd> 로 블록 배치
        </p>
      )}

      <div
        className="relative rounded-2xl overflow-hidden border-2 shadow-2xl bg-black"
        style={{ borderColor: `${theme.accent}55`, boxShadow: `0 0 40px ${theme.accent}22` }}
      >
        <canvas ref={canvasRef} className="w-full aspect-[4/5] min-h-[320px] cursor-pointer touch-none" />
        {phase === "countdown" && !instantPlay && countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20">
            <span className="text-7xl font-black text-white tabular-nums">{countdown > 0 ? countdown : "GO!"}</span>
          </div>
        )}
        {myStats?.collapsed && phase === "playing" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10 pointer-events-none">
            <p className="text-2xl font-black text-red-400">탑 붕괴!</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px]">
        {(["perfect", "great", "good", "bad"] as const).map((g) => (
          <div key={g} className="rounded-lg border border-white/10 bg-black/30 py-2">
            <p style={{ color: GRADE_COLORS[g] }} className="font-bold">
              {GRADE_LABELS[g]}
            </p>
          </div>
        ))}
      </div>

      {canPlay && (
        <Button type="button" className="w-full rounded-xl font-bold h-12" onClick={drop}>
          블록 놓기 (Space / 터치)
        </Button>
      )}

      {finished && myStats && (
        <div className="rounded-2xl border border-indigo-500/40 bg-gradient-to-b from-indigo-950/40 to-black/60 p-5 text-center space-y-2">
          <Crown className="h-8 w-8 mx-auto text-yellow-400" />
          <p className="font-black text-2xl text-yellow-100">{myStats.score.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">
            {myStats.floor}층 · {RANK_TIER_LABELS[myStats.tier]} · Perfect {myStats.perfects}
          </p>
          {myStats.rank && mode !== "solo" && (
            <p className="text-indigo-300 inline-flex items-center justify-center gap-1">
              <Trophy className="h-4 w-4" /> {myStats.rank}위
            </p>
          )}
        </div>
      )}

      {finishOrder.length > 0 && phase === "playing" && mode === "battle_royale" && (
        <p className="text-center text-xs text-indigo-300/80">
          <Wind className="inline h-3 w-3 mr-1" />
          생존 {playerOrder.filter((id) => stats[id]?.alive).length}명
        </p>
      )}
    </div>
  );
}
