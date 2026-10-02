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
  playBeatKick,
  playComboMilestone,
  playCountdownTick,
  playJudgeSound,
  playLaneNote,
  playLongHold,
} from "@/lib/minigames/piano-rush-sounds";
import {
  COMBO_MILESTONES,
  createAmbientField,
  highwayStripeYs,
  JUDGE_COLORS,
  JUDGE_SUBTEXT,
  LANE_COLORS,
  NOTE_TYPE_TINT,
  spawnBeatPulse,
  spawnHitParticles,
  spawnNoteTrail,
  spawnShockwave,
  tickAmbient,
  tickBeatPulses,
  tickParticles,
  tickShockwaves,
  tickTrails,
  type AmbientStar,
  type BeatPulse,
  type HitParticle,
  type NoteTrail,
  type Shockwave,
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

function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number, fever: boolean) {
  const vg = ctx.createRadialGradient(w / 2, h * 0.55, w * 0.15, w / 2, h * 0.55, w * 0.85);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, fever ? "rgba(40,20,0,0.55)" : "rgba(0,0,8,0.65)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
}

function drawScanlines(ctx: CanvasRenderingContext2D, w: number, h: number, alpha: number) {
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
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
  const shockwavesRef = useRef<Shockwave[]>([]);
  const trailsRef = useRef<NoteTrail[]>([]);
  const beatPulsesRef = useRef<BeatPulse[]>([]);
  const ambientRef = useRef<AmbientStar[]>([]);
  const laneFlashRef = useRef([0, 0, 0, 0]);
  const keyPressRef = useRef([0, 0, 0, 0]);
  const lastFrameRef = useRef(0);
  const lastBeatSpawnRef = useRef(-1);
  const lastComboMilestoneRef = useRef(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [judgeFlash, setJudgeFlash] = useState<{ text: string; key: number } | null>(null);
  const [screenFlash, setScreenFlash] = useState<string | null>(null);
  const [milestoneBanner, setMilestoneBanner] = useState<number | null>(null);
  const [perfectShake, setPerfectShake] = useState(false);
  const [activeKeys, setActiveKeys] = useState<Set<number>>(() => new Set());

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
    const wrap = wrapRef.current;
    if (wrap && (lastJudge === "PERFECT" || lastJudge === "GREAT")) {
      const cssW = wrap.getBoundingClientRect().width;
      const pad = cssW * 0.035;
      const hitY = pad + (cssW * 1.42 - pad * 2) * HIT_LINE;
      shockwavesRef.current.push(spawnShockwave(cssW / 2, hitY, 0, lastJudge));
      if (lastJudge === "PERFECT") {
        particlesRef.current.push(...spawnHitParticles(cssW / 2, hitY, 1, "PERFECT", 20));
      }
    }
    if (lastJudge === "PERFECT") {
      setScreenFlash(JUDGE_COLORS.PERFECT);
      setPerfectShake(true);
      setTimeout(() => setScreenFlash(null), 150);
      setTimeout(() => setPerfectShake(false), 280);
    } else if (lastJudge === "GREAT") {
      setScreenFlash("rgba(134,239,172,0.2)");
      setTimeout(() => setScreenFlash(null), 100);
    } else if (lastJudge === "MISS") {
      setScreenFlash("rgba(248,113,113,0.4)");
      setTimeout(() => setScreenFlash(null), 200);
    }
  }, [lastJudge]);

  useEffect(() => {
    for (const m of COMBO_MILESTONES) {
      if (combo >= m && lastComboMilestoneRef.current < m) {
        lastComboMilestoneRef.current = m;
        playComboMilestone(m);
        setMilestoneBanner(m);
        setTimeout(() => setMilestoneBanner(null), 1200);
        break;
      }
    }
    if (combo < 10) lastComboMilestoneRef.current = 0;
  }, [combo]);

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
    shockwavesRef.current = tickShockwaves(shockwavesRef.current, dt);
    trailsRef.current = tickTrails(trailsRef.current, dt);
    beatPulsesRef.current = tickBeatPulses(beatPulsesRef.current, dt);

    if (ambientRef.current.length === 0) {
      ambientRef.current = createAmbientField(cssW, cssH, 55);
    }
    ambientRef.current = tickAmbient(ambientRef.current, dt, cssH);

    for (let i = 0; i < 4; i++) {
      laneFlashRef.current[i] = Math.max(0, laneFlashRef.current[i]! - dt * 2.8);
      keyPressRef.current[i] = Math.max(0, keyPressRef.current[i]! - dt * 3.5);
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

    if (phase === "playing") playBeatKick(bpm, elapsed, fever);

    const beatIdx = Math.floor(elapsed / beatMs);
    if (phase === "playing" && beatIdx !== lastBeatSpawnRef.current) {
      lastBeatSpawnRef.current = beatIdx;
      for (let i = 0; i < 4; i++) beatPulsesRef.current.push(spawnBeatPulse(hitY, i));
    }

    const bg = ctx.createLinearGradient(0, 0, 0, cssH);
    bg.addColorStop(0, fever ? "#2a0a4a" : "#0a0a14");
    bg.addColorStop(0.35, fever ? "#1a0533" : "#0f0f1a");
    bg.addColorStop(1, "#030308");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, cssW, cssH);

    for (const star of ambientRef.current) {
      const lc = LANE_COLORS[Math.floor(star.x / (cssW / 4)) % 4]!;
      ctx.globalAlpha = star.alpha * (0.6 + pulse * 0.4);
      ctx.fillStyle = fever ? lc.core : `hsla(${star.hue}, 70%, 75%, 0.8)`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const stripeYs = highwayStripeYs(pad, hitY, elapsed, bpm);
    for (let i = 0; i < 4; i++) {
      const x = pad + i * laneW;
      const lc = LANE_COLORS[i]!;
      const flash = laneFlashRef.current[i] ?? 0;

      const lg = ctx.createLinearGradient(x, pad, x + laneW, cssH - pad);
      lg.addColorStop(0, lc.dim.replace("0.12", fever ? "0.22" : "0.14"));
      lg.addColorStop(0.5, "rgba(0,0,0,0.2)");
      lg.addColorStop(1, "rgba(0,0,0,0.45)");
      ctx.fillStyle = lg;
      ctx.fillRect(x + 1, pad, laneW - 2, cssH - pad * 2);

      ctx.strokeStyle = `rgba(255,255,255,${0.04 + pulse * 0.04})`;
      ctx.lineWidth = 1;
      for (const sy of stripeYs) {
        const t = (sy - pad) / (hitY - pad);
        const inset = t * laneW * 0.12;
        ctx.beginPath();
        ctx.moveTo(x + 4 + inset, sy);
        ctx.lineTo(x + laneW - 4 - inset, sy);
        ctx.stroke();
      }

      for (const bp of beatPulsesRef.current) {
        if (bp.lane !== i) continue;
        const a = (bp.life / bp.maxLife) * 0.35;
        ctx.fillStyle = lc.glow.replace("0.55", String(a));
        ctx.fillRect(x + 2, bp.y - 3, laneW - 4, 6);
      }

      if (flash > 0.05) {
        ctx.fillStyle = lc.glow.replace("0.55", String(0.3 + flash * 0.55));
        ctx.fillRect(x + 1, hitY - laneW * 0.75, laneW - 2, laneW * 0.7);
        ctx.shadowColor = lc.core;
        ctx.shadowBlur = 20 * flash;
        ctx.strokeStyle = lc.core;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 3, hitY - laneW * 0.5, laneW - 6, laneW * 0.4);
        ctx.shadowBlur = 0;
      }
    }

    for (let i = 0; i <= 4; i++) {
      const x = pad + i * laneW;
      ctx.strokeStyle = `rgba(255,255,255,${0.06 + pulse * 0.06})`;
      ctx.lineWidth = i === 0 || i === 4 ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(x, pad);
      ctx.lineTo(x, cssH - pad);
      ctx.stroke();
    }

    ctx.shadowColor = fever ? "rgba(250,204,21,0.95)" : "rgba(250,204,21,0.7)";
    ctx.shadowBlur = 14 + pulse * 14;
    ctx.strokeStyle = `rgba(250, 204, 21, ${0.7 + pulse * 0.3})`;
    ctx.lineWidth = 3 + pulse * 2.5;
    ctx.beginPath();
    ctx.moveTo(pad, hitY);
    ctx.lineTo(cssW - pad, hitY);
    ctx.stroke();
    ctx.fillStyle = `rgba(250,204,21,${0.08 + pulse * 0.12})`;
    ctx.fillRect(pad, hitY - 2, cssW - pad * 2, 4);
    ctx.shadowBlur = 0;

    for (const t of trailsRef.current) {
      const lc = LANE_COLORS[t.lane]!;
      ctx.globalAlpha = (t.life / t.maxLife) * 0.45;
      ctx.fillStyle = lc.core;
      roundRect(ctx, t.x, t.y, t.w, t.h, 8);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const note of notes) {
      if (hitSet.current.has(note.id)) continue;
      const dtNote = note.t - elapsed;
      if (dtNote < -JUDGE_MS.GOOD - 120 || dtNote > PIANO_RUSH_LOOKAHEAD_MS * speedMul) continue;
      const progress = 1 - dtNote / (PIANO_RUSH_LOOKAHEAD_MS * speedMul);
      const approach = Math.pow(Math.min(1, Math.max(0, progress)), 0.85);
      const y = pad + approach * (hitY - pad);
      const scale = 0.72 + approach * 0.38;
      const x = pad + note.lane * laneW + laneW * (0.1 + (1 - scale) * 0.05);
      const w = laneW * 0.8 * scale;
      const baseH =
        note.type === "long" && note.dur
          ? Math.max(32, (note.dur / (PIANO_RUSH_LOOKAHEAD_MS * speedMul)) * (hitY - pad))
          : 34;
      const h = baseH * scale;
      const lc = LANE_COLORS[note.lane]!;
      const tint = NOTE_TYPE_TINT[note.type] ?? "#fff";
      const noteY = note.type === "long" ? y - h : y;

      if (approach > 0.15 && Math.random() < 0.35) {
        trailsRef.current.push(spawnNoteTrail(x + w * 0.1, noteY + h * 0.2, w * 0.8, h * 0.5, note.lane));
      }

      ctx.shadowColor = lc.glow;
      ctx.shadowBlur = 10 + approach * 18;
      const grad = ctx.createLinearGradient(x, noteY, x, noteY + h);
      grad.addColorStop(0, tint);
      grad.addColorStop(0.5, lc.core);
      grad.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = grad;
      roundRect(ctx, x, noteY, w, h, 10 * scale);
      ctx.fill();

      ctx.strokeStyle = `rgba(255,255,255,${0.35 + approach * 0.35})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (approach > 0.75) {
        ctx.fillStyle = `rgba(255,255,255,${(approach - 0.75) * 1.2})`;
        roundRect(ctx, x + 2, noteY + 2, w - 4, h * 0.35, 6);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      if (note.type === "slide") {
        ctx.fillStyle = "#fff";
        ctx.font = `bold ${Math.round(16 * scale)}px system-ui`;
        ctx.textAlign = "center";
        ctx.fillText(note.dir === "left" ? "◀" : "▶", x + w / 2, noteY + h / 2 + 6);
      }
      if (note.type === "bomb") {
        ctx.fillStyle = "#fecaca";
        ctx.font = `bold ${Math.round(14 * scale)}px system-ui`;
        ctx.textAlign = "center";
        ctx.fillText("✕", x + w / 2, noteY + h / 2 + 5);
      }
      if (note.type === "spam") {
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.font = `bold ${Math.round(11 * scale)}px system-ui`;
        ctx.textAlign = "center";
        ctx.fillText(`${note.taps ?? 3}x`, x + w / 2, noteY + h / 2 + 4);
      }
    }

    for (const w of shockwavesRef.current) {
      const a = w.life / w.maxLife;
      ctx.globalAlpha = a * 0.85;
      ctx.strokeStyle = w.color;
      ctx.lineWidth = w.lineWidth * a;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
      ctx.stroke();
      if (a > 0.5) {
        ctx.globalAlpha = (a - 0.5) * 0.4;
        ctx.fillStyle = w.color;
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    for (const p of particlesRef.current) {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    drawVignette(ctx, cssW, cssH, fever);
    if (phase === "playing") drawScanlines(ctx, cssW, cssH, fever ? 0.025 : 0.015);

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

  function flashKey(lane: number) {
    keyPressRef.current[lane] = 1;
    setActiveKeys((prev) => new Set(prev).add(lane));
    window.setTimeout(() => {
      setActiveKeys((prev) => {
        const next = new Set(prev);
        next.delete(lane);
        return next;
      });
    }, 140);
  }

  function burstLane(lane: number, judge?: string) {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const cssW = wrap.getBoundingClientRect().width;
    const pad = cssW * 0.035;
    const laneW = (cssW - pad * 2) / 4;
    const hitY = pad + (cssW * 1.42 - pad * 2) * HIT_LINE;
    const x = pad + lane * laneW + laneW / 2;
    const isPerfect = judge === "PERFECT";
    particlesRef.current.push(...spawnHitParticles(x, hitY, lane, judge, isPerfect ? 28 : 14));
    shockwavesRef.current.push(spawnShockwave(x, hitY, lane, judge));
    laneFlashRef.current[lane] = 1;
    keyPressRef.current[lane] = 1;
  }

  function handleLaneInput(lane: number, kind: "tap" | "down" | "up", clientX?: number) {
    if (disabled || phase !== "playing") return;
    const elapsed = songElapsed(startedAt, phase);
    const target = findTapTarget(notes, lane, elapsed, hitSet.current);

    if (kind === "tap" && target) {
      playLaneNote(lane, combo);
      burstLane(lane);
      flashKey(lane);
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
      flashKey(lane);
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
  const comboPct = Math.min(100, (combo / 30) * 100);
  const showShake = shake || perfectShake;

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative w-full max-w-lg mx-auto rounded-2xl overflow-hidden border-2 shadow-2xl",
        fever ? "border-yellow-400/60 shadow-yellow-500/30" : "border-violet-500/35 shadow-violet-900/50",
        showShake && "motion-safe:animate-[shake_0.35s_ease-in-out_infinite]",
        perfectShake && "motion-safe:animate-[pianoPerfectShake_0.28s_ease-out]"
      )}
    >
      {phase === "playing" && (
        <div
          className="absolute inset-0 pointer-events-none z-[1]"
          style={{
            background: fever
              ? `radial-gradient(ellipse at 50% 100%, rgba(250,204,21,${0.08 + combo * 0.0003}), transparent 55%)`
              : `radial-gradient(ellipse at 50% 100%, rgba(167,139,250,0.06), transparent 50%)`,
          }}
        />
      )}

      {screenFlash && (
        <div className="absolute inset-0 z-20 pointer-events-none mix-blend-screen" style={{ backgroundColor: screenFlash }} />
      )}

      <canvas ref={canvasRef} className="w-full touch-none block relative z-[2]" />

      {phase === "playing" && !fever && (
        <div className="absolute top-0 left-0 right-0 h-1 z-10 bg-black/40">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-200"
            style={{ width: `${comboPct}%` }}
          />
        </div>
      )}

      {phase === "countdown" && countdown !== null && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/65 backdrop-blur-md z-10">
          <div className="relative">
            <div className="absolute inset-0 blur-3xl bg-violet-500/30 rounded-full scale-150" />
            <span
              key={countdown}
              className="relative text-7xl sm:text-9xl font-black text-white tabular-nums animate-[pianoCountPop_0.55s_ease-out]"
              style={{
                textShadow: "0 0 50px rgba(167,139,250,1), 0 0 100px rgba(34,211,238,0.6), 0 4px 0 rgba(0,0,0,0.5)",
                WebkitTextStroke: "1px rgba(255,255,255,0.2)",
              }}
            >
              {countdown > 0 ? countdown : "GO!"}
            </span>
          </div>
        </div>
      )}

      {judgeFlash && (
        <div
          key={judgeFlash.key}
          className="absolute top-[34%] left-1/2 z-30 pointer-events-none animate-[pianoJudgePop_0.6s_ease-out] text-center"
        >
          <span
            className="block text-4xl sm:text-6xl font-black tracking-widest whitespace-nowrap"
            style={{
              color: JUDGE_COLORS[judgeFlash.text] ?? "#fff",
              textShadow: `0 0 30px ${JUDGE_COLORS[judgeFlash.text] ?? "#fff"}, 0 0 60px ${JUDGE_COLORS[judgeFlash.text] ?? "#fff"}88`,
            }}
          >
            {JUDGE_SUBTEXT[judgeFlash.text] ?? judgeFlash.text}
          </span>
        </div>
      )}

      {milestoneBanner !== null && (
        <div className="absolute top-[22%] left-1/2 -translate-x-1/2 z-25 pointer-events-none animate-[pianoMilestone_1.2s_ease-out]">
          <span className="text-2xl sm:text-3xl font-black text-cyan-200 tracking-wide drop-shadow-[0_0_20px_rgba(34,211,238,0.9)]">
            {milestoneBanner} COMBO!
          </span>
        </div>
      )}

      {fever && phase === "playing" && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 px-4 py-1 rounded-full bg-gradient-to-r from-yellow-500/30 to-orange-500/30 border-2 border-yellow-400/60 text-yellow-100 text-sm font-black animate-[pianoFeverPulse_0.6s_ease-in-out_infinite] shadow-[0_0_24px_rgba(250,204,21,0.5)]">
          🔥 FEVER ×{combo}
        </div>
      )}

      <div className="grid grid-cols-4 gap-1.5 p-2.5 bg-gradient-to-t from-black via-black/95 to-transparent relative z-[3]">
        {[0, 1, 2, 3].map((lane) => {
          const press = activeKeys.has(lane) ? 1 : 0;
          const lc = LANE_COLORS[lane]!;
          return (
            <button
              key={lane}
              type="button"
              disabled={disabled || phase !== "playing"}
              className={cn(
                "rounded-xl py-4 text-base font-black transition-transform border relative overflow-hidden",
                press > 0.1 ? "scale-95" : "active:scale-95"
              )}
              style={{
                color: lc.core,
                borderColor: `${lc.core}${press > 0.2 ? "cc" : "55"}`,
                background: `linear-gradient(180deg, ${lc.dim} 0%, rgba(0,0,0,0.55) 100%)`,
                boxShadow:
                  press > 0.1
                    ? `0 0 28px ${lc.glow}, inset 0 0 20px ${lc.glow}`
                    : `0 0 16px ${lc.glow}`,
              }}
              onPointerDown={(e) => {
                e.preventDefault();
                handleLaneInput(lane, "tap", e.clientX);
              }}
              onPointerUp={() => handleLaneInput(lane, "up")}
            >
              {press > 0.15 && (
                <span
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: `radial-gradient(circle at 50% 80%, ${lc.glow}, transparent 70%)` }}
                />
              )}
              <span className="relative">{LANE_LABELS[lane]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
