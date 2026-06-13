/** 알까기 — 서버·클라이언트 공유 물리 (authoritative on server, no wall bounce) */

export const ALKKAGI_GRID = 19;
export const ALKKAGI_CELL = 27;
export const ALKKAGI_FRAME = 44;
export const ALKKAGI_PLAY_SIZE = ALKKAGI_CELL * (ALKKAGI_GRID - 1);
export const ALKKAGI_BOARD_W = ALKKAGI_PLAY_SIZE;
export const ALKKAGI_BOARD_H = ALKKAGI_PLAY_SIZE;
export const ALKKAGI_CANVAS_SIZE = ALKKAGI_PLAY_SIZE + ALKKAGI_FRAME * 2;
export const ALKKAGI_STONE_R = 12.5;
export const ALKKAGI_TURN_MS = 20_000;
export const ALKKAGI_MAX_PULL = 100;

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

export type AlkkagiFrame = {
  onBoard: AlkkagiStone[];
  falling: AlkkagiStone[];
};

const FRICTION = 0.988;
const STONE_RESTITUTION = 0.9;
const MAX_STEPS = 700;
const REST_VEL = 0.1;
const MAX_SPEED = 16;
const FALL_GRAVITY = 0.35;
const FALL_FRICTION = 0.995;

function cloneStones(stones: AlkkagiStone[]): AlkkagiStone[] {
  return stones.map((s) => ({ ...s }));
}

/** 돌이 판 밖으로 나갔는지 (중심 + 반지름 기준) */
export function isKnockedOut(s: AlkkagiStone, w: number, h: number, r: number): boolean {
  return s.x - r < 0 || s.x + r > w || s.y - r < 0 || s.y + r > h;
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

/** 벽 반발 없음 — 알까기는 판 밖으로 떨어짐 */
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
  }
  for (let i = 0; i < stones.length; i++) {
    for (let j = i + 1; j < stones.length; j++) {
      resolveStonePair(stones[i]!, stones[j]!, r);
    }
  }
}

function stepFalling(falling: AlkkagiStone[], w: number, h: number, r: number): AlkkagiStone[] {
  const next: AlkkagiStone[] = [];
  for (const s of falling) {
    s.x += s.vx;
    s.y += s.vy;
    s.vy += FALL_GRAVITY;
    s.vx *= FALL_FRICTION;
    s.vy *= FALL_FRICTION;
    if (s.y < h + r * 6 && s.x > -r * 4 && s.x < w + r * 4) {
      next.push(s);
    }
  }
  return next;
}

function allRest(stones: AlkkagiStone[]): boolean {
  return stones.every((s) => Math.hypot(s.vx, s.vy) < REST_VEL);
}

export function initAlkkagiStones(playerIds: string[]): AlkkagiStone[] {
  const [a, b] = playerIds;
  const w = ALKKAGI_BOARD_W;
  const h = ALKKAGI_BOARD_H;
  return [
    { id: "a1", x: w * 0.2, y: h * 0.72, ownerId: a!, vx: 0, vy: 0 },
    { id: "a2", x: w * 0.28, y: h * 0.82, ownerId: a!, vx: 0, vy: 0 },
    { id: "a3", x: w * 0.35, y: h * 0.74, ownerId: a!, vx: 0, vy: 0 },
    { id: "a4", x: w * 0.26, y: h * 0.65, ownerId: a!, vx: 0, vy: 0 },
    { id: "b1", x: w * 0.8, y: h * 0.28, ownerId: b!, vx: 0, vy: 0 },
    { id: "b2", x: w * 0.72, y: h * 0.18, ownerId: b!, vx: 0, vy: 0 },
    { id: "b3", x: w * 0.65, y: h * 0.26, ownerId: b!, vx: 0, vy: 0 },
    { id: "b4", x: w * 0.74, y: h * 0.35, ownerId: b!, vx: 0, vy: 0 },
  ];
}

export type AlkkagiShotResult = {
  stones: AlkkagiStone[];
  knockedOut: AlkkagiKnockout[];
  frames: AlkkagiFrame[];
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
  const falling: AlkkagiStone[] = [];
  const knockedOut: AlkkagiKnockout[] = [];
  const frames: AlkkagiFrame[] = [{ onBoard: cloneStones(next), falling: [] }];

  const stone = next.find((s) => s.id === stoneId);
  if (!stone) return { stones: next, knockedOut, frames };

  const clamped = Math.max(0, Math.min(1, power));
  const speed = clamped * MAX_SPEED;
  stone.vx = Math.cos(angle) * speed;
  stone.vy = Math.sin(angle) * speed;

  let fallSteps = 0;

  for (let step = 0; step < MAX_STEPS; step++) {
    physicsStep(next, w, h, r);

    const remaining: AlkkagiStone[] = [];
    for (const s of next) {
      if (isKnockedOut(s, w, h, r)) {
        if (!knockedOut.some((k) => k.stoneId === s.id)) {
          knockedOut.push({ stoneId: s.id, ownerId: s.ownerId });
          falling.push({ ...s });
        }
      } else {
        remaining.push(s);
      }
    }
    next.length = 0;
    next.push(...remaining);

    if (falling.length > 0) {
      const updated = stepFalling(falling, w, h, r);
      falling.length = 0;
      falling.push(...updated);
      fallSteps = Math.max(fallSteps, 40);
    }

    if (step % 2 === 0) {
      frames.push({ onBoard: cloneStones(next), falling: cloneStones(falling) });
    }

    if (allRest(next) && falling.length === 0) break;
  }

  // 떨어지는 돌 애니메이션 연장
  while (falling.length > 0 && fallSteps > 0) {
    const updated = stepFalling(falling, w, h, r);
    falling.length = 0;
    falling.push(...updated);
    frames.push({ onBoard: cloneStones(next), falling: cloneStones(falling) });
    fallSteps -= 1;
  }

  for (const s of next) {
    s.vx = 0;
    s.vy = 0;
  }

  frames.push({ onBoard: cloneStones(next), falling: [] });

  return { stones: next, knockedOut, frames };
}

export function powerColor(power: number): string {
  if (power < 0.35) return "#22c55e";
  if (power < 0.7) return "#eab308";
  return "#ef4444";
}
