"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  JUDGE_MS,
  PIANO_RUSH_KEYS,
  PIANO_RUSH_LOOKAHEAD_MS,
  type PianoChartNote,
  type PianoRushMove,
} from "@/lib/minigames/piano-rush-logic";
import {
  playCountdownTick,
  playJudgeSound,
  playLaneNote,
  playLongHold,
} from "@/lib/minigames/piano-rush-sounds";
import {
  JUDGE_COLORS,
  LANE_COLORS,
  NOTE_TYPE_TINT,
  spawnHitParticles,
  tickParticles,
  type HitParticle,
} from "@/lib/minigames/piano-rush-visuals";
import { cn } from "@/lib/utils";

const LANE_LABELS = ["D", "F", "J", "K"];
const HIT_LINE = 0.84;

type Props = {
  notes: PianoChartNote[];
  startedAt: number;
  phase: "countdown" | "playing" | "finished";
  elapsedMs: number;
  hitNotes: string[];
  bpm?: number;
  combo?: number;
  lastJudge?: string | null;
  disabled?: boolean;
  shake?: boolean;
  speedBoost?: boolean;
  onMove: (move: PianoRushMove) => void;
};

function songElapsed(startedAt: number, phase: string): number {
  if (phase === "countdown") return 0;
  return Math.max(0, Date.now() - startedAt);
}

function findTapTarget(
  notes: PianoChartNote[],
  lane: number,
  elapsed: number,
  hitNotes: Set<string>
): PianoChartNote | undefined {
  let best: PianoChartNote | undefined;
  let bestD = Infinity;
  for (const n of notes) {
    if (n.lane !== lane || hitNotes.has(n.id)) continue;
    if (n.type === "bomb" || n.type === "tap" || n.type === "spam" || n.type === "slide") {
      const d = Math.abs(n.t - elapsed);
      if (d <= JUDGE_MS.GOOD + 80 && d < bestD) {
        bestD = d;
        best = n;
      }
    }
  }
  return best;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function PianoRushLanes({
  notes,
  startedAt,
  phase,
  hitNotes,
  bpm = 120,
  combo = 0,
  lastJudge,
  disabled,
  shake,
  speedBoost,
  onMove,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hitSet = useRef(new Set(hitNotes));
  const longActive = useRef<{ noteId: string; lane: number } | null>(null);
  const slideStart = useRef<{ x: number; lane: number; noteId: string } | null>(null);
  const particlesRef = useRef<HitParticle[]>([]);
  const laneFlashRef = useRef([0, 0, 0, 0]);
  const lastFrameRef = useRef(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [judgeFlash, setJudgeFlash] = useState<{ text: string; key: number } | null>(null);
  const [screenFlash, setScreenFlash] = useState<string | null>(null);

  useEffect(() => {
    hitSet.current = new Set(hitNotes);
  }, [hitNotes]);

  useEffect(() => {
    if (phase !== "countdown") {
      setCountdown(null);
      return;
    }
    const tick = () => setCountdown(Math.max(0, Math.ceil((startedAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 80);
    return () => clearInterval(id);
  }, [phase, startedAt]);

  useEffect(() => {
    if (countdown !== null && countdown <= 3 && countdown >= 0) playCountdownTick(countdown);
  }, [countdown]);

  useEffect(() => {
    if (!lastJudge || lastJudge === "SPAM" || lastJudge === "ATTACK") return;
    if (lastJudge === "PERFECT" || lastJudge === "GREAT" || lastJudge === "GOOD" || lastJudge === "MISS") {
      playJudgeSound(lastJudge);
    }
    setJudgeFlash({ text: lastJudge, key: Date.now() });
    if (lastJudge === "PERFECT") {
      setScreenFlash(JUDGE_COLORS.PERFECT);
      setTimeout(() => setScreenFlash(null), 120);
    } else if (lastJudge === "MISS") {
      setScreenFlash("rgba(248,113,113,0.35)");
      setTimeout(() => setScreenFlash(null), 180);
    }
  }, [lastJudge]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const cssW = rect.width;
    const cssH = cssW * 1.42;
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const now = performance.now();
    const dt = lastFrameRef.current ? (now - lastFrameRef.current) / 1000 : 0.016;
    lastFrameRef.current = now;
    particlesRef.current = tickParticles(particlesRef.current, dt);
    for (let i = 0; i < 4; i++) {
      laneFlashRef.current[i] = Math.max(0, laneFlashRef.current[i]! - dt * 2.8);
    }

    const pad = cssW * 0.035;
    const laneW = (cssW - pad * 2) / 4;
    const hitY = pad + (cssH - pad * 2) * HIT_LINE;
    const elapsed = songElapsed(startedAt, phase);
    const speedMul = speedBoost ? 1.22 : 1;
    const beatMs = 60000 / bpm;
    const beatPhase = (elapsed % beatMs) / beatMs;
    const pulse = 0.5 + 0.5 * Math.cos(beatPhase * Math.PI * 2);
    const fever = combo >= 30;

    const bg = ctx.createLinearGradient(0, 0, 0, cssH);
    bg.addColorStop(0, fever ? "#1a0533" : "#0a0a12");
    bg.addColorStop(0.5, fever ? "#120820" : "#0f0f18");
    bg.addColorStop(1, "#050508");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, cssW, cssH);

    for (let i = 0; i < 4; i++) {
      const x = pad + i * laneW;
      const lc = LANE_COLORS[i]!;
      const flash = laneFlashRef.current[i] ?? 0;
      const lg = ctx.createLinearGradient(x, pad, x, cssH - pad);
      lg.addColorStop(0, lc.dim);
      lg.addColorStop(1, "rgba(0,0,0,0.35)");
      ctx.fillStyle = lg;
      ctx.fillRect(x + 1, pad, laneW - 2, cssH - pad * 2);
      if (flash > 0.05) {
        ctx.fillStyle = lc.glow.replace("0.55", String(0.25 + flash * 0.5));
        ctx.fillRect(x + 1, hitY - laneW * 0.6, laneW - 2, laneW * 0.55);
      }
    }

    for (let i = 0; i <= 4; i++) {
      const x = pad + i * laneW;
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, pad);
      ctx.lineTo(x, cssH - pad);
      ctx.stroke();
    }

    ctx.shadowColor = fever ? "rgba(250,204,21,0.9)" : "rgba(250,204,21,0.65)";
    ctx.shadowBlur = 12 + pulse * 10;
    ctx.strokeStyle = `rgba(250, 204, 21, ${0.65 + pulse * 0.35})`;
    ctx.lineWidth = 3 + pulse * 2;
    ctx.beginPath();
    ctx.moveTo(pad, hitY);
    ctx.lineTo(cssW - pad, hitY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    for (const note of notes) {
      if (hitSet.current.has(note.id)) continue;
      const dtNote = note.t - elapsed;
      if (dtNote < -JUDGE_MS.GOOD - 120 || dtNote > PIANO_RUSH_LOOKAHEAD_MS * speedMul) continue;
      const progress = 1 - dtNote / (PIANO_RUSH_LOOKAHEAD_MS * speedMul);
      const y = pad + progress * (hitY - pad);
      const x = pad + note.lane * laneW + laneW * 0.1;
      const w = laneW * 0.8;
      const h =
        note.type === "long" && note.dur
          ? Math.max(32, (note.dur / (PIANO_RUSH_LOOKAHEAD_MS * speedMul)) * (hitY - pad))
          : 34;
      const lc = LANE_COLORS[note.lane]!;
      const tint = NOTE_TYPE_TINT[note.type] ?? "#fff";
      const noteY = note.type === "long" ? y - h : y;

      ctx.shadowColor = lc.glow;
      ctx.shadowBlur = 14;
      const grad = ctx.createLinearGradient(x, noteY, x, noteY + h);
      grad.addColorStop(0, tint);
      grad.addColorStop(1, lc.core);
      ctx.fillStyle = grad;
      roundRect(ctx, x, noteY, w, h, 10);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (note.type === "slide") {
        ctx.fillStyle = "#fff";
        ctx.font = "bold 16px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(note.dir === "left" ? "◀" : "▶", x + w / 2, noteY + h / 2 + 6);
      }
      if (note.type === "bomb") {
        ctx.fillStyle = "#fecaca";
        ctx.font = "bold 14px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("✕", x + w / 2, noteY + h / 2 + 5);
      }
      if (note.type === "spam") {
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.font = "bold 11px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(`${note.taps ?? 3}x`, x + w / 2, noteY + h / 2 + 4);
      }
    }

    for (const p of particlesRef.current) {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (let i = 0; i < 4; i++) {
      const x = pad + i * laneW + laneW / 2;
      ctx.fillStyle = LANE_COLORS[i]!.core;
      ctx.font = "bold 12px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText(LANE_LABELS[i] ?? "", x, cssH - pad + 16);
    }
  }, [notes, phase, speedBoost, startedAt, bpm, combo]);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [draw]);

  function emit(move: PianoRushMove) {
    if (disabled || phase !== "playing") return;
    onMove(move);
  }

  function burstLane(lane: number, judge?: string) {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const cssW = wrap.getBoundingClientRect().width;
    const pad = cssW * 0.035;
    const laneW = (cssW - pad * 2) / 4;
    const hitY = pad + (cssW * 1.42 - pad * 2) * HIT_LINE;
    const x = pad + lane * laneW + laneW / 2;
    particlesRef.current.push(...spawnHitParticles(x, hitY, lane, judge, judge === "PERFECT" ? 22 : 12));
    laneFlashRef.current[lane] = 1;
  }

  function handleLaneInput(lane: number, kind: "tap" | "down" | "up", clientX?: number) {
    if (disabled || phase !== "playing") return;
    const elapsed = songElapsed(startedAt, phase);
    const target = findTapTarget(notes, lane, elapsed, hitSet.current);

    if (kind === "tap" && target) {
      playLaneNote(lane, combo);
      burstLane(lane);
      if (target.type === "slide") {
        slideStart.current = { x: clientX ?? 0, lane, noteId: target.id };
        return;
      }
      if (target.type === "long") {
        longActive.current = { noteId: target.id, lane };
        emit({ type: "long_start", noteId: target.id, lane, atMs: elapsed });
        playLongHold(lane);
        return;
      }
      if (target.type === "spam") {
        emit({ type: "spam", noteId: target.id, lane, atMs: elapsed });
        return;
      }
      emit({ type: "tap", noteId: target.id, lane, atMs: elapsed });
      return;
    }

    if (kind === "tap" && !target) {
      laneFlashRef.current[lane] = 0.35;
    }

    if (kind === "up" && longActive.current?.lane === lane) {
      const { noteId } = longActive.current;
      longActive.current = null;
      emit({ type: "long_end", noteId, lane, atMs: elapsed });
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const idx = PIANO_RUSH_KEYS.indexOf(e.key.toLowerCase() as (typeof PIANO_RUSH_KEYS)[number]);
      if (idx < 0) return;
      e.preventDefault();
      if (e.type === "keydown" && !e.repeat) handleLaneInput(idx, "tap");
      if (e.type === "keyup") handleLaneInput(idx, "up");
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  });

  useEffect(() => {
    if (!slideStart.current) return;
    function onMovePointer(e: PointerEvent) {
      const s = slideStart.current;
      if (!s) return;
      const dx = e.clientX - s.x;
      if (Math.abs(dx) < 28) return;
      const dir = dx < 0 ? "left" : "right";
      const elapsed = songElapsed(startedAt, phase);
      burstLane(s.lane, "GREAT");
      emit({ type: "slide", noteId: s.noteId, lane: s.lane, dir, atMs: elapsed });
      slideStart.current = null;
    }
    window.addEventListener("pointermove", onMovePointer);
    return () => window.removeEventListener("pointermove", onMovePointer);
  }, [phase, startedAt]);

  const fever = combo >= 30;

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative w-full max-w-lg mx-auto rounded-2xl overflow-hidden border-2 shadow-2xl",
        fever ? "border-yellow-400/50 shadow-yellow-500/20" : "border-violet-500/30 shadow-violet-900/40",
        shake && "motion-safe:animate-[shake_0.35s_ease-in-out_infinite]"
      )}
    >
      {screenFlash && (
        <div className="absolute inset-0 z-20 pointer-events-none" style={{ backgroundColor: screenFlash }} />
      )}
      <canvas ref={canvasRef} className="w-full touch-none block" />
      {phase === "countdown" && countdown !== null && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-10">
          <span
            key={countdown}
            className="text-7xl sm:text-8xl font-black text-white tabular-nums animate-[pianoCountPop_0.55s_ease-out]"
            style={{
              textShadow: "0 0 40px rgba(167,139,250,0.9), 0 0 80px rgba(34,211,238,0.5)",
            }}
          >
            {countdown > 0 ? countdown : "GO!"}
          </span>
        </div>
      )}
      {judgeFlash && (
        <div
          key={judgeFlash.key}
          className="absolute top-[38%] left-1/2 z-30 pointer-events-none -translate-x-1/2 animate-[pianoJudgePop_0.55s_ease-out]"
        >
          <span
            className="text-3xl sm:text-5xl font-black tracking-wider whitespace-nowrap"
            style={{
              color: JUDGE_COLORS[judgeFlash.text] ?? "#fff",
              textShadow: `0 0 24px ${JUDGE_COLORS[judgeFlash.text] ?? "#fff"}`,
            }}
          >
            {judgeFlash.text}
          </span>
        </div>
      )}
      {fever && phase === "playing" && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 px-3 py-0.5 rounded-full bg-yellow-400/20 border border-yellow-400/50 text-yellow-200 text-xs font-bold animate-pulse">
          FEVER ×{combo}
        </div>
      )}
      <div className="grid grid-cols-4 gap-1.5 p-2.5 bg-gradient-to-t from-black via-black/90 to-transparent">
        {[0, 1, 2, 3].map((lane) => (
          <button
            key={lane}
            type="button"
            disabled={disabled || phase !== "playing"}
            className={cn(
              "rounded-xl py-4 text-base font-black transition-all active:scale-95 border",
              "shadow-lg"
            )}
            style={{
              color: LANE_COLORS[lane]!.core,
              borderColor: `${LANE_COLORS[lane]!.core}55`,
              background: `linear-gradient(180deg, ${LANE_COLORS[lane]!.dim} 0%, rgba(0,0,0,0.5) 100%)`,
              boxShadow: `0 0 16px ${LANE_COLORS[lane]!.glow}`,
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              handleLaneInput(lane, "tap", e.clientX);
            }}
            onPointerUp={() => handleLaneInput(lane, "up")}
          >
            {LANE_LABELS[lane]}
          </button>
        ))}
      </div>
    </div>
  );
}
