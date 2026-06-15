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

export const NOTE_TYPE_TINT: Record<string, string> = {
  tap: "#ffffff",
  long: "#60a5fa",
  spam: "#e879f9",
  slide: "#34d399",
  bomb: "#ef4444",
};

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

export function spawnHitParticles(
  x: number,
  y: number,
  lane: number,
  judge?: string,
  count = 14
): HitParticle[] {
  const lc = LANE_COLORS[lane] ?? LANE_COLORS[0];
  const color = judge ? (JUDGE_COLORS[judge] ?? lc.core) : lc.core;
  const out: HitParticle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const speed = 2 + Math.random() * 5;
    out.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: 1,
      maxLife: 0.45 + Math.random() * 0.35,
      color,
      size: 2 + Math.random() * 4,
    });
  }
  return out;
}

export function tickParticles(particles: HitParticle[], dt: number): HitParticle[] {
  return particles
    .map((p) => ({
      ...p,
      x: p.x + p.vx * dt * 60,
      y: p.y + p.vy * dt * 60,
      vy: p.vy + 0.15 * dt * 60,
      life: p.life - dt,
    }))
    .filter((p) => p.life > 0);
}
