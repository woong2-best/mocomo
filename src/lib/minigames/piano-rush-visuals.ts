/** 피아노 러쉬 — 레인·노트·이펙트 상수 */

export const LANE_COLORS = [
  { core: "#22d3ee", glow: "rgba(34, 211, 238, 0.55)", dim: "rgba(34, 211, 238, 0.12)" },
  { core: "#a78bfa", glow: "rgba(167, 139, 250, 0.55)", dim: "rgba(167, 139, 250, 0.12)" },
  { core: "#f472b6", glow: "rgba(244, 114, 182, 0.55)", dim: "rgba(244, 114, 182, 0.12)" },
  { core: "#fbbf24", glow: "rgba(251, 191, 36, 0.55)", dim: "rgba(251, 191, 36, 0.12)" },
] as const;

export const JUDGE_COLORS: Record<string, string> = {
  PERFECT: "#fde047",
  GREAT: "#86efac",
  GOOD: "#93c5fd",
  MISS: "#f87171",
  ATTACK: "#fb923c",
};

export const JUDGE_SUBTEXT: Record<string, string> = {
  PERFECT: "★ PERFECT ★",
  GREAT: "GREAT!",
  GOOD: "GOOD",
  MISS: "MISS…",
};

export const NOTE_TYPE_TINT: Record<string, string> = {
  tap: "#ffffff",
  long: "#60a5fa",
  spam: "#e879f9",
  slide: "#34d399",
  bomb: "#ef4444",
};

export const COMBO_MILESTONES = [10, 25, 50, 75, 100, 150, 200] as const;

export type HitParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
};

export type Shockwave = {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  life: number;
  maxLife: number;
  lineWidth: number;
};

export type NoteTrail = {
  x: number;
  y: number;
  w: number;
  h: number;
  lane: number;
  life: number;
  maxLife: number;
};

export type AmbientStar = {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
  hue: number;
};

export type BeatPulse = {
  y: number;
  lane: number;
  life: number;
  maxLife: number;
};

export function spawnHitParticles(
  x: number,
  y: number,
  lane: number,
  judge?: string,
  count = 14
): HitParticle[] {
  const lc = LANE_COLORS[lane] ?? LANE_COLORS[0];
  const color = judge ? (JUDGE_COLORS[judge] ?? lc.core) : lc.core;
  const boost = judge === "PERFECT" ? 1.6 : judge === "GREAT" ? 1.2 : 1;
  const n = Math.floor(count * boost);
  const out: HitParticle[] = [];
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n + Math.random() * 0.5;
    const speed = (2.5 + Math.random() * 6) * boost;
    out.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (2 + Math.random() * 2),
      life: 1,
      maxLife: 0.4 + Math.random() * 0.45,
      color: i % 3 === 0 ? "#fff" : color,
      size: (2 + Math.random() * 5) * (judge === "PERFECT" ? 1.3 : 1),
    });
  }
  if (judge === "PERFECT") {
    for (let i = 0; i < 8; i++) {
      out.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 12,
        vy: -4 - Math.random() * 8,
        life: 1,
        maxLife: 0.6 + Math.random() * 0.3,
        color: "#fde047",
        size: 1 + Math.random() * 2,
      });
    }
  }
  return out;
}

export function spawnShockwave(x: number, y: number, lane: number, judge?: string): Shockwave {
  const lc = LANE_COLORS[lane] ?? LANE_COLORS[0];
  const color = judge ? (JUDGE_COLORS[judge] ?? lc.core) : lc.core;
  return {
    x,
    y,
    radius: 8,
    maxRadius: judge === "PERFECT" ? 120 : judge === "GREAT" ? 85 : 60,
    color,
    life: 1,
    maxLife: judge === "PERFECT" ? 0.55 : 0.4,
    lineWidth: judge === "PERFECT" ? 4 : 2.5,
  };
}

export function spawnNoteTrail(x: number, y: number, w: number, h: number, lane: number): NoteTrail {
  return { x, y, w, h, lane, life: 1, maxLife: 0.35 };
}

export function createAmbientField(width: number, height: number, count = 40): AmbientStar[] {
  const out: AmbientStar[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 0.5 + Math.random() * 2,
      speed: 0.15 + Math.random() * 0.6,
      alpha: 0.15 + Math.random() * 0.45,
      hue: Math.random() * 360,
    });
  }
  return out;
}

export function tickAmbient(stars: AmbientStar[], dt: number, height: number): AmbientStar[] {
  return stars.map((s) => {
    let y = s.y + s.speed * dt * 40;
    if (y > height + 4) y = -4;
    return { ...s, y };
  });
}

export function tickParticles(particles: HitParticle[], dt: number): HitParticle[] {
  return particles
    .map((p) => ({
      ...p,
      x: p.x + p.vx * dt * 60,
      y: p.y + p.vy * dt * 60,
      vy: p.vy + 0.12 * dt * 60,
      life: p.life - dt,
    }))
    .filter((p) => p.life > 0);
}

export function tickShockwaves(waves: Shockwave[], dt: number): Shockwave[] {
  return waves
    .map((w) => {
      const t = 1 - w.life / w.maxLife;
      return {
        ...w,
        radius: 8 + (w.maxRadius - 8) * t,
        life: w.life - dt,
      };
    })
    .filter((w) => w.life > 0);
}

export function tickTrails(trails: NoteTrail[], dt: number): NoteTrail[] {
  return trails
    .map((t) => ({ ...t, life: t.life - dt * 1.8 }))
    .filter((t) => t.life > 0);
}

export function tickBeatPulses(pulses: BeatPulse[], dt: number, speed = 280): BeatPulse[] {
  return pulses
    .map((p) => ({ ...p, y: p.y + speed * dt, life: p.life - dt }))
    .filter((p) => p.life > 0 && p.y < 2000);
}

export function spawnBeatPulse(y: number, lane: number): BeatPulse {
  return { y, lane, life: 1, maxLife: 0.8 };
}

/** 3D 하이웨이 스트라이프 Y 위치 (BPM 동기) */
export function highwayStripeYs(
  pad: number,
  hitY: number,
  elapsed: number,
  bpm: number,
  spacing = 52
): number[] {
  const beatMs = 60000 / bpm;
  const offset = ((elapsed % beatMs) / beatMs) * spacing;
  const ys: number[] = [];
  for (let y = hitY - offset; y >= pad; y -= spacing) ys.push(y);
  for (let y = hitY - offset + spacing; y <= hitY + (hitY - pad) * 0.15; y += spacing) ys.push(y);
  return ys;
}
