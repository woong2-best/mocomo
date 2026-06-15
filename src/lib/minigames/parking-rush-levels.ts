import type { MapType, ParkingDifficulty, ParkingLevel } from "./parking-rush-logic";

function baseLot(
  id: string,
  name: string,
  mapType: MapType,
  difficulty: ParkingDifficulty,
  timeLimitMs: number,
  spotCount: number,
  groundColor: string,
  accentColor: string,
  extraObstacles: ParkingLevel["obstacles"] = []
): ParkingLevel {
  const w = 42;
  const h = 58;
  const spots = Array.from({ length: spotCount }, (_, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    return {
      id: `spot-${i}`,
      x: 8 + col * 5.5,
      y: 12 + row * 7.5,
      w: 2.4,
      h: 5,
      angle: Math.PI / 2,
      reverseOnly: row % 2 === 1,
    };
  });

  return {
    id,
    name,
    mapType,
    difficulty,
    timeLimitMs,
    bounds: { x: 0, y: 0, w, h },
    groundColor,
    accentColor,
    walls: [
      { x: w / 2, y: 1, w, h: 2, kind: "wall", color: "#64748b" },
      { x: w / 2, y: h - 1, w, h: 2, kind: "wall", color: "#64748b" },
      { x: 1, y: h / 2, w: 2, h, kind: "wall", color: "#64748b" },
      { x: w - 1, y: h / 2, w: 2, h, kind: "wall", color: "#64748b" },
    ],
    obstacles: [
      { x: 21, y: 28, w: 1.2, h: 1.2, kind: "pillar", color: "#94a3b8" },
      { x: 30, y: 35, w: 1.2, h: 1.2, kind: "pillar", color: "#94a3b8" },
      { x: 18, y: 42, w: 0.5, h: 0.5, kind: "cone", color: "#f97316" },
      { x: 19, y: 43, w: 0.5, h: 0.5, kind: "cone", color: "#f97316" },
      { x: 32, y: 20, w: 4.2, h: 1.85, angle: 0, kind: "car", color: "#475569" },
      { x: 10, y: 48, w: 8, h: 0.3, kind: "fence", color: "#cbd5e1" },
      ...extraObstacles,
    ],
    parkingSpots: spots,
    spawnPoints: spots.map((s, i) => ({
      x: w / 2 + (i % 2 === 0 ? -8 : 8),
      y: h - 6 - (i % 3) * 2,
      angle: -Math.PI / 2,
    })),
  };
}

export const PARKING_LEVELS: ParkingLevel[] = [
  baseLot("lot-beginner", "초급 주차장", "parking_lot", "beginner", 120_000, 8, "#2a3444", "#22d3ee"),
  baseLot("mart-intermediate", "대형마트 주차장", "mart", "intermediate", 100_000, 12, "#374151", "#a78bfa", [
    { x: 14, y: 30, w: 6, h: 0.4, kind: "fence", color: "#e2e8f0" },
    { x: 28, y: 38, w: 0.5, h: 0.5, kind: "cone", color: "#f97316" },
    { x: 29, y: 39, w: 0.5, h: 0.5, kind: "cone", color: "#f97316" },
    { x: 30, y: 40, w: 0.5, h: 0.5, kind: "cone", color: "#f97316" },
  ]),
  baseLot("apartment-advanced", "아파트 지하주차장", "underground", "advanced", 90_000, 16, "#1e293b", "#fbbf24", [
    { x: 12, y: 18, w: 1.4, h: 1.4, kind: "pillar", color: "#64748b" },
    { x: 8, y: 40, w: 1.4, h: 1.4, kind: "pillar", color: "#64748b" },
    { x: 34, y: 22, w: 4.5, h: 1.9, angle: 0.2, kind: "car", color: "#334155" },
    { x: 16, y: 46, w: 4.8, h: 2, angle: -0.15, kind: "car", color: "#475569" },
    { x: 25, y: 15, w: 0.5, h: 0.5, kind: "cone", color: "#f97316" },
    { x: 26, y: 16, w: 0.5, h: 0.5, kind: "cone", color: "#f97316" },
    { x: 20, y: 50, w: 10, h: 0.35, kind: "fence", color: "#94a3b8" },
  ]),
  baseLot("downtown-expert", "도심 옥상주차장", "downtown", "expert", 75_000, 16, "#334155", "#fde047", [
    { x: 15, y: 38, w: 1.2, h: 1.2, kind: "pillar", color: "#94a3b8" },
    { x: 33, y: 44, w: 1.2, h: 1.2, kind: "pillar", color: "#94a3b8" },
    { x: 22, y: 18, w: 5, h: 2, angle: 0.4, kind: "car", color: "#1e293b" },
    { x: 10, y: 28, w: 8, h: 2.2, angle: -0.3, kind: "car", color: "#475569" },
    { x: 28, y: 48, w: 4.5, h: 1.85, kind: "car", color: "#64748b" },
    { x: 19, y: 42, w: 0.5, h: 0.5, kind: "cone", color: "#f97316" },
    { x: 20, y: 43, w: 0.5, h: 0.5, kind: "cone", color: "#f97316" },
    { x: 21, y: 44, w: 0.5, h: 0.5, kind: "cone", color: "#f97316" },
    { x: 22, y: 45, w: 0.5, h: 0.5, kind: "cone", color: "#f97316" },
    { x: 6, y: 50, w: 12, h: 0.3, kind: "fence", color: "#ef4444" },
  ]),
  baseLot("apartment-surface", "아파트 옥외주차장", "apartment", "intermediate", 95_000, 12, "#4b5563", "#86efac", [
    { x: 24, y: 32, w: 1.3, h: 1.3, kind: "pillar", color: "#9ca3af" },
    { x: 14, y: 44, w: 5, h: 2, kind: "car", color: "#374151" },
    { x: 30, y: 18, w: 0.5, h: 0.5, kind: "cone", color: "#f97316" },
  ]),
  baseLot("harbor-advanced", "항구 물류주차장", "harbor", "advanced", 85_000, 14, "#1e3a5f", "#38bdf8", [
    { x: 20, y: 26, w: 2, h: 2, kind: "pillar", color: "#64748b" },
    { x: 32, y: 40, w: 2, h: 2, kind: "pillar", color: "#64748b" },
    { x: 12, y: 35, w: 6, h: 2.4, angle: 0.25, kind: "car", color: "#334155" },
    { x: 28, y: 22, w: 8, h: 0.4, kind: "fence", color: "#fcd34d" },
    { x: 18, y: 48, w: 0.5, h: 0.5, kind: "cone", color: "#f97316" },
    { x: 19, y: 49, w: 0.5, h: 0.5, kind: "cone", color: "#f97316" },
  ]),
  baseLot("airport-expert", "공항 장기주차장", "airport", "expert", 70_000, 16, "#312e81", "#c4b5fd", [
    { x: 21, y: 30, w: 1.5, h: 1.5, kind: "pillar", color: "#818cf8" },
    { x: 11, y: 22, w: 1.5, h: 1.5, kind: "pillar", color: "#818cf8" },
    { x: 31, y: 42, w: 1.5, h: 1.5, kind: "pillar", color: "#818cf8" },
    { x: 26, y: 16, w: 5.5, h: 2, angle: 0.15, kind: "car", color: "#1e1b4b" },
    { x: 15, y: 46, w: 4.8, h: 1.9, kind: "car", color: "#4338ca" },
    { x: 8, y: 38, w: 14, h: 0.35, kind: "fence", color: "#e0e7ff" },
    { x: 23, y: 40, w: 0.5, h: 0.5, kind: "cone", color: "#f97316" },
    { x: 24, y: 41, w: 0.5, h: 0.5, kind: "cone", color: "#f97316" },
    { x: 25, y: 42, w: 0.5, h: 0.5, kind: "cone", color: "#f97316" },
  ]),
  baseLot("rooftop-intermediate", "옥상주차장", "rooftop", "intermediate", 100_000, 10, "#475569", "#fde68a", [
    { x: 21, y: 34, w: 1.1, h: 1.1, kind: "pillar", color: "#94a3b8" },
    { x: 29, y: 20, w: 4, h: 1.8, kind: "car", color: "#334155" },
    { x: 5, y: 52, w: 10, h: 0.3, kind: "fence", color: "#ef4444" },
  ]),
];

export const PARKING_LEVEL_IDS = PARKING_LEVELS.map((l) => l.id);

export function pickParkingLevel(opts?: { levelId?: string; difficulty?: ParkingDifficulty }): ParkingLevel {
  if (opts?.levelId) {
    const found = PARKING_LEVELS.find((l) => l.id === opts.levelId);
    if (found) return found;
  }
  if (opts?.difficulty) {
    const pool = PARKING_LEVELS.filter((l) => l.difficulty === opts.difficulty);
    if (pool.length) return pool[Math.floor(Math.random() * pool.length)]!;
  }
  return PARKING_LEVELS[0]!;
}

export function levelsForPicker() {
  return PARKING_LEVELS.map((l) => ({
    id: l.id,
    name: l.name,
    difficulty: l.difficulty,
    mapType: l.mapType,
    timeLimitSec: Math.floor(l.timeLimitMs / 1000),
  }));
}
