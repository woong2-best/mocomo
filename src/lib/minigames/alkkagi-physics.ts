/** 알까기 — 서버·클라이언트 공유 물리 (authoritative on server) */

export const ALKKAGI_BOARD_W = 520;
export const ALKKAGI_BOARD_H = 520;
export const ALKKAGI_STONE_R = 20;
export const ALKKAGI_TURN_MS = 20_000;
export const ALKKAGI_MAX_PULL = 120;

export type AlkkagiStone = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: string;
};

export type AlkkagiKnockout = {
  stoneId: string;
  ownerId: string;
};

const FRICTION = 0.985;
const WALL_RESTITUTION = 0.55;
const STONE_RESTITUTION = 0.88;
const MAX_STEPS = 600;
const REST_VEL = 0.12;
const MAX_SPEED = 18;

function cloneStones(stones: AlkkagiStone[]): AlkkagiStone[] {
  return stones.map((s) => ({ ...s }));
}

function inBounds(s: AlkkagiStone, w: number, h: number, r: number): boolean {
  return s.x >= r && s.x <= w - r && s.y >= r && s.y <= h - r;
}

function resolveWall(s: AlkkagiStone, w: number, h: number, r: number) {
  if (s.x < r) {
    s.x = r;
    s.vx = Math.abs(s.vx) * WALL_RESTITUTION;
  } else if (s.x > w - r) {
    s.x = w - r;
    s.vx = -Math.abs(s.vx) * WALL_RESTITUTION;
  }
  if (s.y < r) {
    s.y = r;
    s.vy = Math.abs(s.vy) * WALL_RESTITUTION;
  } else if (s.y > h - r) {
    s.y = h - r;
    s.vy = -Math.abs(s.vy) * WALL_RESTITUTION;
  }
}

function resolveStonePair(a: AlkkagiStone, b: AlkkagiStone, r: number) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) || 0.001;
  if (dist >= r * 2) return;

  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = r * 2 - dist;
  a.x -= nx * overlap * 0.5;
  a.y -= ny * overlap * 0.5;
  b.x += nx * overlap * 0.5;
  b.y += ny * overlap * 0.5;

  const dvx = a.vx - b.vx;
  const dvy = a.vy - b.vy;
  const rel = dvx * nx + dvy * ny;
  if (rel <= 0) return;

  const impulse = rel * STONE_RESTITUTION;
  a.vx -= impulse * nx;
  a.vy -= impulse * ny;
  b.vx += impulse * nx;
  b.vy += impulse * ny;
}

function physicsStep(stones: AlkkagiStone[], w: number, h: number, r: number) {
  for (const s of stones) {
    s.x += s.vx;
    s.y += s.vy;
    s.vx *= FRICTION;
    s.vy *= FRICTION;
    const speed = Math.hypot(s.vx, s.vy);
    if (speed > MAX_SPEED) {
      s.vx = (s.vx / speed) * MAX_SPEED;
      s.vy = (s.vy / speed) * MAX_SPEED;
    }
    resolveWall(s, w, h, r);
  }
  for (let i = 0; i < stones.length; i++) {
    for (let j = i + 1; j < stones.length; j++) {
      resolveStonePair(stones[i]!, stones[j]!, r);
    }
  }
}

function allRest(stones: AlkkagiStone[]): boolean {
  return stones.every((s) => Math.hypot(s.vx, s.vy) < REST_VEL);
}

export function initAlkkagiStones(playerIds: string[]): AlkkagiStone[] {
  const [a, b] = playerIds;
  const w = ALKKAGI_BOARD_W;
  const h = ALKKAGI_BOARD_H;
  return [
    { id: "a1", x: w * 0.22, y: h * 0.28, ownerId: a!, vx: 0, vy: 0 },
    { id: "a2", x: w * 0.32, y: h * 0.38, ownerId: a!, vx: 0, vy: 0 },
    { id: "a3", x: w * 0.26, y: h * 0.48, ownerId: a!, vx: 0, vy: 0 },
    { id: "a4", x: w * 0.18, y: h * 0.4, ownerId: a!, vx: 0, vy: 0 },
    { id: "b1", x: w * 0.78, y: h * 0.72, ownerId: b!, vx: 0, vy: 0 },
    { id: "b2", x: w * 0.68, y: h * 0.62, ownerId: b!, vx: 0, vy: 0 },
    { id: "b3", x: w * 0.74, y: h * 0.52, ownerId: b!, vx: 0, vy: 0 },
    { id: "b4", x: w * 0.82, y: h * 0.6, ownerId: b!, vx: 0, vy: 0 },
  ];
}

export type AlkkagiShotResult = {
  stones: AlkkagiStone[];
  knockedOut: AlkkagiKnockout[];
  /** 클라이언트 애니메이션용 (매 3스텝 샘플) */
  frames: AlkkagiStone[][];
};

/** angle: 발사 방향(rad), power: 0~1 */
export function simulateAlkkagiShot(
  stones: AlkkagiStone[],
  stoneId: string,
  angle: number,
  power: number,
  w = ALKKAGI_BOARD_W,
  h = ALKKAGI_BOARD_H,
  r = ALKKAGI_STONE_R
): AlkkagiShotResult {
  const next = cloneStones(stones);
  const stone = next.find((s) => s.id === stoneId);
  const knockedOut: AlkkagiKnockout[] = [];
  const frames: AlkkagiStone[][] = [cloneStones(next)];

  if (!stone) return { stones: next, knockedOut, frames };

  const clamped = Math.max(0, Math.min(1, power));
  const speed = clamped * MAX_SPEED;
  stone.vx = Math.cos(angle) * speed;
  stone.vy = Math.sin(angle) * speed;

  for (let step = 0; step < MAX_STEPS; step++) {
    physicsStep(next, w, h, r);

    const remaining: AlkkagiStone[] = [];
    for (const s of next) {
      if (inBounds(s, w, h, r)) {
        remaining.push(s);
      } else if (!knockedOut.some((k) => k.stoneId === s.id)) {
        knockedOut.push({ stoneId: s.id, ownerId: s.ownerId });
      }
    }
    next.length = 0;
    next.push(...remaining);

    if (step % 3 === 0) frames.push(cloneStones(next));

    if (allRest(next)) break;
  }

  for (const s of next) {
    s.vx = 0;
    s.vy = 0;
  }

  return { stones: next, knockedOut, frames };
}

export function powerColor(power: number): string {
  if (power < 0.35) return "#22c55e";
  if (power < 0.7) return "#eab308";
  return "#ef4444";
}
