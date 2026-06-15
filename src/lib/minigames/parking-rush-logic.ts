/** 주차 러쉬 — 공유 게임 로직 (서버 authoritative) */

export const PARKING_RUSH_COUNTDOWN_MS = 3000;
export const PARKING_RUSH_TICK_MS = 100;
export const PARKING_RUSH_PHYSICS_DT = 1 / 60;
export const PARKING_RUSH_MAX_SPEED_KMH = 80;
export const PARKING_RUSH_PARK_HOLD_MS = 800;
export const PARKING_RUSH_MAX_COLLISIONS = 12;
export const PARKING_RUSH_FRAME_RECORD_MS = 500;

export const CAR_COLOR_PRESETS = [
  { id: "cyan", label: "시안", hex: "#22d3ee" },
  { id: "violet", label: "바이올렛", hex: "#a78bfa" },
  { id: "pink", label: "핑크", hex: "#f472b6" },
  { id: "gold", label: "골드", hex: "#fbbf24" },
  { id: "mint", label: "민트", hex: "#34d399" },
  { id: "orange", label: "오렌지", hex: "#fb923c" },
  { id: "white", label: "화이트", hex: "#e2e8f0" },
  { id: "red", label: "레드", hex: "#ef4444" },
] as const;

export type CarColorId = (typeof CAR_COLOR_PRESETS)[number]["id"];

export function resolveCarColor(id?: string, fallback?: string): string {
  const preset = CAR_COLOR_PRESETS.find((c) => c.id === id);
  if (preset) return preset.hex;
  if (fallback && /^#[0-9a-f]{6}$/i.test(fallback)) return fallback;
  return CAR_COLOR_PRESETS[0]!.hex;
}

export type ParkingFrame = {
  type: "parking_frame";
  t: number;
  cars: Record<
    string,
    {
      x: number;
      y: number;
      angle: number;
      speed: number;
      vehicleId: VehicleTypeId;
      color?: string;
      blinker?: ParkingInput["blinker"];
    }
  >;
};

export type ParkingCollisionRecord = {
  type: "parking_collision";
  userId: string;
  t: number;
  kind: string;
  strength: string;
};

export type ParkingRushMode = "solo" | "duel" | "ranked" | "time_attack";
export type ParkingDifficulty = "beginner" | "intermediate" | "advanced" | "expert";
export type MapType =
  | "parking_lot"
  | "mart"
  | "apartment"
  | "downtown"
  | "underground"
  | "rooftop"
  | "harbor"
  | "airport";
export type VehicleTypeId = "compact" | "sedan" | "suv" | "van" | "pickup" | "bus";
export type RankTier =
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond"
  | "master"
  | "grandmaster";

export type Rect = { x: number; y: number; w: number; h: number; angle?: number };

export type ObstacleKind = "wall" | "pillar" | "car" | "fence" | "cone";

export type Obstacle = Rect & { kind: ObstacleKind; color?: string };

export type ParkingSpot = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  angle: number;
  reverseOnly?: boolean;
};

export type ParkingLevel = {
  id: string;
  name: string;
  mapType: MapType;
  difficulty: ParkingDifficulty;
  timeLimitMs: number;
  bounds: Rect;
  walls: Obstacle[];
  obstacles: Obstacle[];
  parkingSpots: ParkingSpot[];
  spawnPoints: { x: number; y: number; angle: number }[];
  groundColor: string;
  accentColor: string;
};

export type VehicleSpec = {
  id: VehicleTypeId;
  label: string;
  length: number;
  width: number;
  wheelbase: number;
  maxSpeed: number;
  acceleration: number;
  brakeForce: number;
  reverseAccel: number;
  turnRate: number;
  mass: number;
  color: string;
};

export const VEHICLE_SPECS: Record<VehicleTypeId, VehicleSpec> = {
  compact: {
    id: "compact",
    label: "경차",
    length: 3.6,
    width: 1.65,
    wheelbase: 2.4,
    maxSpeed: 11,
    acceleration: 5.5,
    brakeForce: 9,
    reverseAccel: 3.5,
    turnRate: 2.8,
    mass: 900,
    color: "#22d3ee",
  },
  sedan: {
    id: "sedan",
    label: "세단",
    length: 4.6,
    width: 1.85,
    wheelbase: 2.8,
    maxSpeed: 12,
    acceleration: 5,
    brakeForce: 8.5,
    reverseAccel: 3.2,
    turnRate: 2.4,
    mass: 1400,
    color: "#a78bfa",
  },
  suv: {
    id: "suv",
    label: "SUV",
    length: 4.8,
    width: 1.95,
    wheelbase: 2.85,
    maxSpeed: 11,
    acceleration: 4.2,
    brakeForce: 8,
    reverseAccel: 3,
    turnRate: 2.1,
    mass: 1800,
    color: "#f472b6",
  },
  van: {
    id: "van",
    label: "밴",
    length: 5.2,
    width: 1.9,
    wheelbase: 3.1,
    maxSpeed: 9.5,
    acceleration: 3.5,
    brakeForce: 7.5,
    reverseAccel: 2.8,
    turnRate: 1.9,
    mass: 2100,
    color: "#fbbf24",
  },
  pickup: {
    id: "pickup",
    label: "픽업",
    length: 5.4,
    width: 1.95,
    wheelbase: 3.2,
    maxSpeed: 10,
    acceleration: 4,
    brakeForce: 7.8,
    reverseAccel: 3,
    turnRate: 2,
    mass: 2000,
    color: "#34d399",
  },
  bus: {
    id: "bus",
    label: "버스",
    length: 8,
    width: 2.4,
    wheelbase: 4.5,
    maxSpeed: 8,
    acceleration: 2.5,
    brakeForce: 6.5,
    reverseAccel: 2,
    turnRate: 1.4,
    mass: 3500,
    color: "#fb923c",
  },
};

export type CarState = {
  x: number;
  y: number;
  angle: number;
  speed: number;
  steer: number;
  vehicleId: VehicleTypeId;
};

export type ParkingInput = {
  throttle: number;
  steer: number;
  handbrake?: boolean;
  horn?: boolean;
  blinker?: "left" | "right" | "hazard" | "off";
};

export type CollisionEvent = {
  kind: ObstacleKind | "boundary";
  strength: "light" | "heavy";
  speed: number;
  atMs: number;
};

export type PlayerParkingStats = {
  vehicleId: VehicleTypeId;
  carColor: string;
  blinker: ParkingInput["blinker"];
  hornUntil: number;
  car: CarState;
  spotId: string;
  score: number;
  collisions: number;
  lightHits: number;
  heavyHits: number;
  parked: boolean;
  parkedAt: number | null;
  parkHoldMs: number;
  reversePark: boolean;
  rank: number | null;
  finished: boolean;
  combo: number;
  maxCombo: number;
  hornCount: number;
  lastCollision: CollisionEvent | null;
  tier: RankTier;
};

export const RANK_TIER_LABELS: Record<RankTier, string> = {
  bronze: "브론즈",
  silver: "실버",
  gold: "골드",
  platinum: "플래티넘",
  diamond: "다이아",
  master: "마스터",
  grandmaster: "그랜드마스터",
};

export const MAP_TYPE_LABELS: Record<MapType, string> = {
  parking_lot: "미국식 야외 주차장",
  mart: "대형마트",
  apartment: "아파트",
  downtown: "도심",
  underground: "지하주차장",
  rooftop: "옥상주차장",
  harbor: "항구",
  airport: "공항",
};

export const MODE_LABELS: Record<ParkingRushMode, string> = {
  solo: "싱글 플레이",
  duel: "실시간 대전",
  ranked: "랭크전",
  time_attack: "타임어택",
};

export function parkingModeFromPlayers(count: number, requested?: ParkingRushMode): ParkingRushMode {
  if (requested === "solo" || requested === "time_attack") return requested;
  if (requested === "ranked") return "ranked";
  if (count <= 1) return "solo";
  return requested ?? "duel";
}

/** 싱글·타임어택: 로비/카운트다운 없이 즉시 플레이 */
export function isParkingInstantPlayMode(mode: ParkingRushMode): boolean {
  return mode === "solo" || mode === "time_attack";
}

export function vehicleForPlayer(index: number): VehicleTypeId {
  const order: VehicleTypeId[] = ["compact", "sedan", "suv", "van", "pickup", "bus"];
  return order[index % order.length]!;
}

export function tierFromScore(score: number): RankTier {
  if (score >= 9500) return "grandmaster";
  if (score >= 8000) return "master";
  if (score >= 6500) return "diamond";
  if (score >= 5000) return "platinum";
  if (score >= 3500) return "gold";
  if (score >= 2000) return "silver";
  return "bronze";
}

export function clampInput(v: number): number {
  return Math.max(-1, Math.min(1, v));
}

export function normalizeInput(raw: unknown): ParkingInput {
  if (!raw || typeof raw !== "object") return { throttle: 0, steer: 0 };
  const m = raw as Record<string, unknown>;
  return {
    throttle: clampInput(Number(m.throttle) || 0),
    steer: clampInput(Number(m.steer) || 0),
    handbrake: !!m.handbrake,
    horn: !!m.horn,
    blinker:
      m.blinker === "left" || m.blinker === "right" || m.blinker === "hazard"
        ? m.blinker
        : "off",
  };
}

function carCorners(car: CarState, spec: VehicleSpec): { x: number; y: number }[] {
  const hw = spec.width / 2;
  const hl = spec.length / 2;
  const cos = Math.cos(car.angle);
  const sin = Math.sin(car.angle);
  const local = [
    { x: hl, y: hw },
    { x: hl, y: -hw },
    { x: -hl, y: -hw },
    { x: -hl, y: hw },
  ];
  return local.map((p) => ({
    x: car.x + p.x * cos - p.y * sin,
    y: car.y + p.x * sin + p.y * cos,
  }));
}

function pointInRotatedRect(px: number, py: number, spot: ParkingSpot): boolean {
  const cos = Math.cos(-spot.angle);
  const sin = Math.sin(-spot.angle);
  const dx = px - spot.x;
  const dy = py - spot.y;
  const lx = dx * cos - dy * sin;
  const ly = dx * sin + dy * cos;
  return Math.abs(lx) <= spot.w / 2 - 0.15 && Math.abs(ly) <= spot.h / 2 - 0.15;
}

function angleDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

export function checkParkingProgress(
  car: CarState,
  spec: VehicleSpec,
  spot: ParkingSpot,
  holdMs: number,
  dtMs: number
): { holdMs: number; parked: boolean; alignment: number; reversePark: boolean } {
  const corners = carCorners(car, spec);
  const allInside = corners.every((c) => pointInRotatedRect(c.x, c.y, spot));
  const angOk = angleDiff(car.angle, spot.angle) < 0.18;
  const speedOk = Math.abs(car.speed) < 0.35;
  const reversePark = Math.cos(car.angle - spot.angle) < -0.5;

  if (allInside && angOk && speedOk) {
    const next = holdMs + dtMs;
    return {
      holdMs: next,
      parked: next >= PARKING_RUSH_PARK_HOLD_MS,
      alignment: 1 - angleDiff(car.angle, spot.angle) / 0.18,
      reversePark,
    };
  }
  return { holdMs: 0, parked: false, alignment: 0, reversePark: false };
}

function resolveRectCollision(car: CarState, spec: VehicleSpec, rect: Rect, restitution = 0.35) {
  const cos = Math.cos(rect.angle ?? 0);
  const sin = Math.sin(rect.angle ?? 0);
  const hw = rect.w / 2;
  const hh = rect.h / 2;

  const dx = car.x - rect.x;
  const dy = car.y - rect.y;
  const lx = dx * cos + dy * sin;
  const ly = -dx * sin + dy * cos;

  const carHw = spec.width / 2 + 0.05;
  const carHl = spec.length / 2 + 0.05;
  const overlapX = carHl + hw - Math.abs(lx);
  const overlapY = carHw + hh - Math.abs(ly);
  if (overlapX <= 0 || overlapY <= 0) return null;

  let nx = 0;
  let ny = 0;
  let depth = 0;
  if (overlapX < overlapY) {
    depth = overlapX;
    nx = lx > 0 ? cos : -cos;
    ny = lx > 0 ? sin : -sin;
  } else {
    depth = overlapY;
    nx = ly > 0 ? -sin : sin;
    ny = ly > 0 ? cos : -cos;
  }

  car.x += nx * depth;
  car.y += ny * depth;

  const vDot = car.speed * (Math.cos(car.angle) * nx + Math.sin(car.angle) * ny);
  if (vDot < 0) {
    car.speed -= vDot * (1 + restitution);
    car.speed *= 0.92;
  }
  return Math.abs(car.speed);
}

export function stepCarPhysics(
  car: CarState,
  spec: VehicleSpec,
  input: ParkingInput,
  level: ParkingLevel,
  dt: number
): CollisionEvent | null {
  const throttle = input.throttle;
  const handbrake = !!input.handbrake;

  if (throttle > 0.05) {
    car.speed += spec.acceleration * throttle * dt;
  } else if (throttle < -0.05) {
    if (car.speed > 0.3) {
      car.speed -= spec.brakeForce * Math.abs(throttle) * dt;
    } else {
      car.speed -= spec.reverseAccel * throttle * dt;
    }
  }

  const friction = handbrake ? 14 : 4.5;
  if (Math.abs(throttle) < 0.05) {
    if (car.speed > 0) car.speed = Math.max(0, car.speed - friction * dt);
    else car.speed = Math.min(0, car.speed + friction * dt);
  }

  car.speed = Math.max(-spec.maxSpeed * 0.45, Math.min(spec.maxSpeed, car.speed));

  const steerInput = input.steer * (handbrake ? 1.35 : 1);
  const targetSteer = steerInput * 0.55;
  car.steer += (targetSteer - car.steer) * Math.min(1, dt * 8);

  const turnFactor = Math.min(1, Math.abs(car.speed) / 3.5);
  car.angle += car.steer * spec.turnRate * turnFactor * dt * Math.sign(car.speed || 1);

  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;

  const { bounds, walls, obstacles } = level;
  let hitSpeed = 0;
  let hitKind: ObstacleKind | "boundary" = "boundary";

  if (car.x < bounds.x + spec.length / 2) {
    car.x = bounds.x + spec.length / 2;
    car.speed *= -0.25;
    hitSpeed = Math.abs(car.speed);
  }
  if (car.x > bounds.x + bounds.w - spec.length / 2) {
    car.x = bounds.x + bounds.w - spec.length / 2;
    car.speed *= -0.25;
    hitSpeed = Math.abs(car.speed);
  }
  if (car.y < bounds.y + spec.width / 2) {
    car.y = bounds.y + spec.width / 2;
    car.speed *= -0.25;
    hitSpeed = Math.abs(car.speed);
  }
  if (car.y > bounds.y + bounds.h - spec.width / 2) {
    car.y = bounds.y + bounds.h - spec.width / 2;
    car.speed *= -0.25;
    hitSpeed = Math.abs(car.speed);
  }

  for (const w of walls) {
    const s = resolveRectCollision(car, spec, w, 0.25);
    if (s !== null) {
      hitSpeed = Math.max(hitSpeed, s);
      hitKind = w.kind;
    }
  }
  for (const o of obstacles) {
    const s = resolveRectCollision(car, spec, o, o.kind === "cone" ? 0.15 : 0.32);
    if (s !== null) {
      hitSpeed = Math.max(hitSpeed, s);
      hitKind = o.kind;
    }
  }

  if (hitSpeed > 0.5) {
    return {
      kind: hitKind,
      strength: hitSpeed > 4 ? "heavy" : "light",
      speed: hitSpeed,
      atMs: Date.now(),
    };
  }
  return null;
}

export function applyCollisionScore(st: PlayerParkingStats, ev: CollisionEvent): PlayerParkingStats {
  const next = { ...st };
  next.collisions += 1;
  next.combo = 0;
  next.lastCollision = ev;
  if (ev.strength === "heavy") {
    next.heavyHits += 1;
    next.score = Math.max(0, next.score - 180);
  } else {
    next.lightHits += 1;
    next.score = Math.max(0, next.score - 60);
  }
  return next;
}

export function scoreParkingSuccess(
  st: PlayerParkingStats,
  elapsedMs: number,
  timeLimitMs: number,
  alignment: number,
  reversePark: boolean
): number {
  let score = 3000;
  const timeLeft = Math.max(0, timeLimitMs - elapsedMs);
  score += Math.floor((timeLeft / timeLimitMs) * 4000);
  score -= st.collisions * 80;
  score -= st.heavyHits * 120;
  score += Math.floor(alignment * 800);
  if (st.collisions === 0) score += 1000;
  if (reversePark) score += 600;
  score += st.combo * 50;
  return Math.max(500, score);
}

export function buildParkingResultMessage(
  mode: ParkingRushMode,
  stats: Record<string, PlayerParkingStats>,
  names: Record<string, string>,
  levelName: string
): { winnerId: string; resultMessage: string } {
  const entries = Object.entries(stats).sort((a, b) => {
    if (a[1].parked && !b[1].parked) return -1;
    if (!a[1].parked && b[1].parked) return 1;
    if (a[1].parked && b[1].parked) return (a[1].parkedAt ?? 0) - (b[1].parkedAt ?? 0);
    return b[1].score - a[1].score;
  });

  const top = entries[0];
  if (!top) return { winnerId: "", resultMessage: `${levelName} — 결과 없음` };

  const [winnerId, wst] = top;
  const winnerName = names[winnerId] ?? "플레이어";

  if (mode === "solo" || mode === "time_attack") {
    return {
      winnerId,
      resultMessage: wst.parked
        ? `${winnerName} · ${levelName} 주차 성공! ${wst.score.toLocaleString()}점 (${RANK_TIER_LABELS[wst.tier]})`
        : `${winnerName} · 시간 초과 · ${wst.score.toLocaleString()}점`,
    };
  }

  return {
    winnerId,
    resultMessage: wst.parked
      ? `${winnerName} · ${levelName} 최초 주차 성공!`
      : `${winnerName} · ${levelName} 최고 점수`,
  };
}

export function emptyPlayerStats(
  userId: string,
  vehicleId: VehicleTypeId,
  spotId: string,
  spawn: { x: number; y: number; angle: number },
  carColor?: string
): PlayerParkingStats {
  void userId;
  return {
    vehicleId,
    carColor: carColor ?? VEHICLE_SPECS[vehicleId].color,
    blinker: "off",
    hornUntil: 0,
    car: { x: spawn.x, y: spawn.y, angle: spawn.angle, speed: 0, steer: 0, vehicleId },
    spotId,
    score: 0,
    collisions: 0,
    lightHits: 0,
    heavyHits: 0,
    parked: false,
    parkedAt: null,
    parkHoldMs: 0,
    reversePark: false,
    rank: null,
    finished: false,
    combo: 0,
    maxCombo: 0,
    hornCount: 0,
    lastCollision: null,
    tier: "bronze",
  };
}

export function statsPublic(st: PlayerParkingStats) {
  return {
    vehicleId: st.vehicleId,
    carColor: st.carColor,
    blinker: st.blinker,
    hornActive: st.hornUntil > Date.now(),
    car: st.car,
    spotId: st.spotId,
    score: st.score,
    collisions: st.collisions,
    lightHits: st.lightHits,
    heavyHits: st.heavyHits,
    parked: st.parked,
    parkedAt: st.parkedAt,
    parkProgress: Math.min(1, st.parkHoldMs / PARKING_RUSH_PARK_HOLD_MS),
    reversePark: st.reversePark,
    rank: st.rank,
    finished: st.finished,
    combo: st.combo,
    maxCombo: st.maxCombo,
    tier: st.tier,
    lastCollision: st.lastCollision,
  };
}
