"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  JUDGE_MS,
  PIANO_RUSH_KEYS,
  PIANO_RUSH_LOOKAHEAD_MS,
  type PianoChartNote,
  type PianoRushMove,
} from "@/lib/minigames/piano-rush-logic";
import { playCountdownTick, playJudgeSound, playLaneNote, playLongHold } from "@/lib/minigames/piano-rush-sounds";
import { cn } from "@/lib/utils";

const LANE_LABELS = ["D", "F", "J", "K"];
const HIT_LINE = 0.82;

type Props = {
  notes: PianoChartNote[];
  startedAt: number;
  phase: "countdown" | "playing" | "finished";
  elapsedMs: number;
  hitNotes: string[];
  disabled?: boolean;
  shake?: boolean;
  speedBoost?: boolean;
  onMove: (move: PianoRushMove) => void;
  onLocalJudge?: (judge: string) => void;
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

export function PianoRushLanes({
  notes,
  startedAt,
  phase,
  elapsedMs,
  hitNotes,
  disabled,
  shake,
  speedBoost,
  onMove,
  onLocalJudge,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hitSet = useRef(new Set(hitNotes));
  const longActive = useRef<{ noteId: string; lane: number } | null>(null);
  const slideStart = useRef<{ x: number; lane: number; noteId: string } | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [judgeFlash, setJudgeFlash] = useState<string | null>(null);

  useEffect(() => {
    hitSet.current = new Set(hitNotes);
  }, [hitNotes]);

  useEffect(() => {
    if (phase !== "countdown") {
      setCountdown(null);
      return;
    }
    const tick = () => {
      const left = Math.ceil((startedAt - Date.now()) / 1000);
      setCountdown(Math.max(0, left));
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [phase, startedAt]);

  useEffect(() => {
    if (countdown !== null && countdown <= 3 && countdown >= 0) {
      playCountdownTick(countdown);
    }
  }, [countdown]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const cssW = rect.width;
    const cssH = cssW * 1.35;
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const pad = cssW * 0.04;
    const laneW = (cssW - pad * 2) / 4;
    const hitY = pad + (cssH - pad * 2) * HIT_LINE;
    const elapsed = songElapsed(startedAt, phase);
    const speedMul = speedBoost ? 1.25 : 1;

    ctx.fillStyle = "#0f0f14";
    ctx.fillRect(0, 0, cssW, cssH);

    for (let i = 0; i <= 4; i++) {
      const x = pad + i * laneW;
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, pad);
      ctx.lineTo(x, cssH - pad);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(250, 204, 21, 0.85)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pad, hitY);
    ctx.lineTo(cssW - pad, hitY);
    ctx.stroke();

    for (const note of notes) {
      if (hitSet.current.has(note.id)) continue;
      const dt = note.t - elapsed;
      if (dt < -JUDGE_MS.GOOD - 100 || dt > PIANO_RUSH_LOOKAHEAD_MS * speedMul) continue;
      const progress = 1 - dt / (PIANO_RUSH_LOOKAHEAD_MS * speedMul);
      const y = pad + progress * (hitY - pad);
      const x = pad + note.lane * laneW + laneW * 0.15;
      const w = laneW * 0.7;
      const h =
        note.type === "long" && note.dur
          ? Math.max(24, (note.dur / (PIANO_RUSH_LOOKAHEAD_MS * speedMul)) * (hitY - pad))
          : 28;

      if (note.type === "bomb") ctx.fillStyle = "#7f1d1d";
      else if (note.type === "long") ctx.fillStyle = "#1d4ed8";
      else if (note.type === "spam") ctx.fillStyle = "#a21caf";
      else if (note.type === "slide") ctx.fillStyle = "#047857";
      else ctx.fillStyle = "#fafafa";

      ctx.fillRect(x, y - (note.type === "long" ? h : 0), w, h);
      if (note.type === "slide") {
        ctx.fillStyle = "#fff";
        ctx.font = "bold 14px sans-serif";
        ctx.fillText(note.dir === "left" ? "←" : "→", x + w / 2 - 6, y + 18);
      }
      if (note.type === "bomb") {
        ctx.fillStyle = "#fecaca";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText("✕", x + w / 2 - 5, y + 18);
      }
    }

    for (let i = 0; i < 4; i++) {
      const x = pad + i * laneW + laneW / 2;
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = "11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(LANE_LABELS[i] ?? "", x, cssH - pad + 14);
    }
  }, [notes, phase, speedBoost, startedAt]);

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

  function handleLaneInput(lane: number, kind: "tap" | "down" | "up", clientX?: number) {
    if (disabled || phase !== "playing") return;
    const elapsed = songElapsed(startedAt, phase);
    const target = findTapTarget(notes, lane, elapsed, hitSet.current);

    if (kind === "tap" && target) {
      playLaneNote(lane);
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
      if (Math.abs(dx) < 30) return;
      const dir = dx < 0 ? "left" : "right";
      const elapsed = songElapsed(startedAt, phase);
      emit({ type: "slide", noteId: s.noteId, lane: s.lane, dir, atMs: elapsed });
      slideStart.current = null;
    }
    window.addEventListener("pointermove", onMovePointer);
    return () => window.removeEventListener("pointermove", onMovePointer);
  }, [phase, startedAt]);

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative w-full max-w-md mx-auto rounded-xl overflow-hidden border border-white/10",
        shake && "animate-[shake_0.4s_ease-in-out_infinite]"
      )}
    >
      <canvas ref={canvasRef} className="w-full touch-none" />
      {phase === "countdown" && countdown !== null && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <span className="text-6xl font-black text-white tabular-nums">
            {countdown > 0 ? countdown : "GO!"}
          </span>
        </div>
      )}
      {judgeFlash && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 text-xl font-bold text-yellow-300 pointer-events-none">
          {judgeFlash}
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 grid grid-cols-4 gap-0 h-16 opacity-0">
        {[0, 1, 2, 3].map((lane) => (
          <button
            key={lane}
            type="button"
            aria-label={`레인 ${lane + 1}`}
            className="h-full w-full"
            disabled={disabled}
            onPointerDown={(e) => handleLaneInput(lane, "down", e.clientX)}
            onPointerUp={() => handleLaneInput(lane, "up")}
            onClick={() => handleLaneInput(lane, "tap")}
          />
        ))}
      </div>
      <div className="grid grid-cols-4 gap-1 p-2 bg-black/40">
        {[0, 1, 2, 3].map((lane) => (
          <button
            key={lane}
            type="button"
            disabled={disabled || phase !== "playing"}
            className="rounded-lg bg-white/10 py-3 text-sm font-bold text-white/80 active:bg-white/25"
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

export function flashJudge(
  setJudgeFlash: (v: string | null) => void,
  judge: string,
  onLocalJudge?: (j: string) => void
) {
  if (judge === "PERFECT" || judge === "GREAT" || judge === "GOOD" || judge === "MISS") {
    playJudgeSound(judge);
  }
  onLocalJudge?.(judge);
  setJudgeFlash(judge);
  setTimeout(() => setJudgeFlash(null), 400);
}
