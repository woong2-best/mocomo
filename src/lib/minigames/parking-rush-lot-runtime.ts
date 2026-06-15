import type { Obstacle, ParkingSpot } from "./parking-rush-logic";

const PARKED_CAR_COLORS = [
  "#64748b",
  "#334155",
  "#475569",
  "#1e293b",
  "#52525b",
  "#374151",
  "#4b5563",
  "#6b7280",
  "#78716c",
  "#57534e",
];

export type PlayerLotRuntime = {
  targetSpotId: string;
  parkedCarObstacles: Obstacle[];
};

function pickColor(seed: number): string {
  return PARKED_CAR_COLORS[Math.abs(seed) % PARKED_CAR_COLORS.length]!;
}

export function spotToParkedCar(spot: ParkingSpot, colorSeed = Math.random() * 1000): Obstacle {
  return {
    x: spot.x,
    y: spot.y,
    w: 4.6,
    h: 1.95,
    angle: spot.angle,
    kind: "car",
    color: pickColor(Math.floor(colorSeed * 997 + spot.x * 13 + spot.y * 17)),
    spotId: spot.id,
  };
}

/** 전봇대(코브라 라이트) — scene-environment와 동일 간격 */
export function buildLightPoleObstacles(w: number, h: number): Obstacle[] {
  const poles: Obstacle[] = [];
  const spacing = 14;
  for (let x = spacing; x < w; x += spacing) {
    for (const y of [h * 0.35, h * 0.72]) {
      poles.push({ x, y, w: 0.55, h: 0.55, kind: "pillar", color: "#52525b" });
    }
  }
  return poles;
}

export function initPlayerLotRuntime(spots: ParkingSpot[]): PlayerLotRuntime {
  if (spots.length === 0) {
    return { targetSpotId: "spot-0", parkedCarObstacles: [] };
  }
  const targetIdx = Math.floor(Math.random() * spots.length);
  const targetSpotId = spots[targetIdx]!.id;
  const parkedCarObstacles = spots
    .filter((s) => s.id !== targetSpotId)
    .map((s, i) => spotToParkedCar(s, i));
  return { targetSpotId, parkedCarObstacles };
}

export function advancePlayerLotRuntime(
  spots: ParkingSpot[],
  lot: PlayerLotRuntime,
  completedSpotId: string
): PlayerLotRuntime {
  const completedSpot = spots.find((s) => s.id === completedSpotId);
  let parkedCarObstacles = [...lot.parkedCarObstacles];

  if (completedSpot) {
    parkedCarObstacles.push(spotToParkedCar(completedSpot, completedSpotId.length * 31));
  }

  const carObstacles = parkedCarObstacles.filter((o) => o.kind === "car" && o.spotId);
  const candidates = carObstacles.filter((o) => o.spotId !== completedSpotId);
  const pool = candidates.length > 0 ? candidates : carObstacles;

  if (pool.length === 0) {
    return initPlayerLotRuntime(spots);
  }

  const next = pool[Math.floor(Math.random() * pool.length)]!;
  const targetSpotId = next.spotId!;
  parkedCarObstacles = parkedCarObstacles.filter((o) => o.spotId !== targetSpotId);

  return { targetSpotId, parkedCarObstacles };
}

export function mergePlayerObstacles(staticObstacles: Obstacle[], lot: PlayerLotRuntime): Obstacle[] {
  return [...staticObstacles, ...lot.parkedCarObstacles];
}
