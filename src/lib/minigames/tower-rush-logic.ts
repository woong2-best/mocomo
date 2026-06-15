/** 타워 러쉬 — 공유 게임 로직 (서버 authoritative) */

export const TOWER_RUSH_COUNTDOWN_MS = 3000;
export const TOWER_RUSH_TICK_MS = 50;
export const TOWER_RUSH_GAME_MS = 120_000;
export const TOWER_RUSH_FRAME_RECORD_MS = 400;

export const TOWER_WORLD_W = 100;
export const TOWER_BASE_W = 42;
export const TOWER_BLOCK_H = 3.2;
export const TOWER_MIN_OVERLAP = 0.1;

export type TowerRushMode = "solo" | "duel" | "party" | "battle_royale" | "ranked";
export type TowerMapId =
  | "city"
  | "desert"
  | "ice"
  | "space"
  | "ocean"
  | "volcano"
  | "clouds";
export type BlockTypeId = "normal" | "long" | "short" | "heavy" | "light" | "spin";
export type AccuracyGrade = "perfect" | "great" | "good" | "bad" | "miss";
export type RankTier =
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond"
  | "master"
  | "grandmaster";

export type TowerBlock = {
  x: number;
  width: number;
  y: number;
  type: BlockTypeId;
  color: string;
};

export type TowerMover = {
  x: number;
  width: number;
  dir: 1 | -1;
  speed: number;
  type: BlockTypeId;
  spin: number;
};

export type TowerInput = { drop: boolean };

export type PlayerTowerStats = {
  userId: string;
  floor: number;
  score: number;
  combo: number;
  maxCombo: number;
  alive: boolean;
  finished: boolean;
  collapsed: boolean;
  rank: number | null;
  tier: RankTier;
  blocks: TowerBlock[];
  mover: TowerMover | null;
  dropQueued: boolean;
  lastGrade: AccuracyGrade | null;
  tilt: number;
  perfects: number;
  cameraY: number;
};

export const MODE_LABELS: Record<TowerRushMode, string> = {
  solo: "싱글",
  duel: "1대1",
  party: "파티",
  battle_royale: "배틀로얄",
  ranked: "랭크전",
};

export const MAP_LABELS: Record<TowerMapId, string> = {
  city: "도심",
  desert: "사막",
  ice: "빙하",
  space: "우주",
  ocean: "바다",
  volcano: "화산",
  clouds: "구름 위",
};

export const GRADE_LABELS: Record<AccuracyGrade, string> = {
  perfect: "Perfect",
  great: "Great",
  good: "Good",
  bad: "Bad",
  miss: "Miss",
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

export const BLOCK_TYPES: BlockTypeId[] = ["normal", "long", "short", "heavy", "light", "spin"];

const GRADE_SCORE: Record<AccuracyGrade, number> = {
  perfect: 120,
  great: 80,
  good: 45,
  bad: 15,
  miss: 0,
};

const BLOCK_PALETTE = ["#38bdf8", "#a78bfa", "#f472b6", "#fbbf24", "#34d399", "#fb923c", "#f87171"];

export function isTowerInstantPlayMode(mode: TowerRushMode): boolean {
  return mode === "solo";
}

export function towerModeFromPlayers(count: number, requested?: TowerRushMode): TowerRushMode {
  if (requested === "solo" || requested === "ranked" || requested === "battle_royale") return requested;
  if (count <= 1) return "solo";
  if (count === 2) return "duel";
  if (count <= 8) return "party";
  return "battle_royale";
}

export function pickTowerMap(id?: string): TowerMapId {
  const maps: TowerMapId[] = ["city", "desert", "ice", "space", "ocean", "volcano", "clouds"];
  if (id && maps.includes(id as TowerMapId)) return id as TowerMapId;
  return maps[Math.floor(Math.random() * maps.length)]!;
}

export function normalizeTowerInput(raw: unknown): TowerInput {
  if (!raw || typeof raw !== "object") return { drop: false };
  const m = raw as Record<string, unknown>;
  return { drop: !!m.drop };
}

export function tierFromScore(score: number): RankTier {
  if (score >= 12000) return "grandmaster";
  if (score >= 8000) return "master";
  if (score >= 5000) return "diamond";
  if (score >= 3000) return "platinum";
  if (score >= 1500) return "gold";
  if (score >= 600) return "silver";
  return "bronze";
}

function blockWidthMultiplier(type: BlockTypeId): number {
  switch (type) {
    case "long":
      return 1.35;
    case "short":
      return 0.72;
    case "heavy":
      return 1.05;
    case "light":
      return 0.88;
    default:
      return 1;
  }
}

function pickBlockType(floor: number): BlockTypeId {
  if (floor < 3) return "normal";
  const pool = BLOCK_TYPES.slice(0, Math.min(BLOCK_TYPES.length, 2 + Math.floor(floor / 5)));
  return pool[floor % pool.length]!;
}

export function moverSpeedForFloor(floor: number, map: TowerMapId): number {
  const base = 28 + floor * 1.8;
  const cap = map === "space" ? 95 : map === "desert" ? 88 : 78;
  return Math.min(cap, base);
}

export function windForMap(map: TowerMapId, floor: number, t: number): number {
  const phase = t * 0.001;
  switch (map) {
    case "desert":
      return Math.sin(phase * 2.1) * (4 + floor * 0.08);
    case "ice":
      return Math.sin(phase * 3.5) * 2.5;
    case "ocean":
      return Math.sin(phase * 1.4) * 3.5;
    case "clouds":
      return Math.sin(phase * 1.8) * (5 + floor * 0.05);
    case "volcano":
      return Math.sin(phase * 4) * 1.8;
    default:
      return Math.sin(phase * 1.2) * (1.5 + floor * 0.03);
  }
}

export function spawnMover(
  floor: number,
  baseWidth: number,
  map: TowerMapId,
  prevCenter?: number
): TowerMover {
  const type = pickBlockType(floor);
  const width = Math.max(6, baseWidth * blockWidthMultiplier(type) * Math.max(0.55, 1 - floor * 0.004));
  const speed = moverSpeedForFloor(floor, map);
  const x = prevCenter ?? TOWER_WORLD_W / 2;
  return {
    x: x <= TOWER_WORLD_W / 2 ? 8 + width / 2 : TOWER_WORLD_W - 8 - width / 2,
    width,
    dir: x <= TOWER_WORLD_W / 2 ? 1 : -1,
    speed,
    type,
    spin: type === "spin" ? 0.12 : 0,
  };
}

export function emptyPlayerStats(userId: string, map: TowerMapId): PlayerTowerStats {
  const base: TowerBlock = {
    x: TOWER_WORLD_W / 2,
    width: TOWER_BASE_W,
    y: 0,
    type: "normal",
    color: BLOCK_PALETTE[0]!,
  };
  return {
    userId,
    floor: 0,
    score: 0,
    combo: 0,
    maxCombo: 0,
    alive: true,
    finished: false,
    collapsed: false,
    rank: null,
    tier: "bronze",
    blocks: [base],
    mover: spawnMover(0, TOWER_BASE_W, map, base.x),
    dropQueued: false,
    lastGrade: null,
    tilt: 0,
    perfects: 0,
    cameraY: 0,
  };
}

export function gradeFromPlacement(offsetRatio: number, overlapRatio: number): AccuracyGrade {
  if (overlapRatio < TOWER_MIN_OVERLAP) return "miss";
  if (offsetRatio < 0.025) return "perfect";
  if (offsetRatio < 0.07) return "great";
  if (offsetRatio < 0.14) return "good";
  if (offsetRatio < 0.26) return "bad";
  return "miss";
}

export type PlaceResult = {
  collapsed: boolean;
  grade: AccuracyGrade;
};

export function stepMover(mover: TowerMover, dt: number, map: TowerMapId, floor: number, elapsedMs: number) {
  const wind = windForMap(map, floor, elapsedMs) * dt;
  mover.x += mover.dir * mover.speed * dt + wind * dt;
  if (mover.type === "spin") mover.dir = (Math.sin(elapsedMs * 0.004 + mover.spin) > 0 ? 1 : -1) as 1 | -1;
  const half = mover.width / 2;
  if (mover.x - half <= 2) {
    mover.x = 2 + half;
    mover.dir = 1;
  }
  if (mover.x + half >= TOWER_WORLD_W - 2) {
    mover.x = TOWER_WORLD_W - 2 - half;
    mover.dir = -1;
  }
}

export function placeBlock(
  st: PlayerTowerStats,
  map: TowerMapId
): PlaceResult {
  const top = st.blocks[st.blocks.length - 1];
  const mover = st.mover;
  if (!top || !mover || !st.alive) return { collapsed: true, grade: "miss" };

  const moverLeft = mover.x - mover.width / 2;
  const moverRight = mover.x + mover.width / 2;
  const topLeft = top.x - top.width / 2;
  const topRight = top.x + top.width / 2;
  const overlapLeft = Math.max(moverLeft, topLeft);
  const overlapRight = Math.min(moverRight, topRight);
  const overlapWidth = overlapRight - overlapLeft;
  const overlapRatio = overlapWidth / top.width;
  const offsetRatio = Math.abs(mover.x - top.x) / top.width;
  const grade = gradeFromPlacement(offsetRatio, overlapRatio);

  if (grade === "miss" || overlapWidth <= 0) {
    st.collapsed = true;
    st.alive = false;
    st.finished = true;
    st.mover = null;
    st.lastGrade = "miss";
    return { collapsed: true, grade: "miss" };
  }

  const newCenter = (overlapLeft + overlapRight) / 2;
  const tiltDelta = newCenter - top.x;
  st.tilt += tiltDelta;
  if (Math.abs(st.tilt) > top.width * 1.85) {
    st.collapsed = true;
    st.alive = false;
    st.finished = true;
    st.mover = null;
    st.lastGrade = grade;
    return { collapsed: true, grade };
  }

  const newBlock: TowerBlock = {
    x: newCenter,
    width: overlapWidth,
    y: top.y + TOWER_BLOCK_H,
    type: mover.type,
    color: BLOCK_PALETTE[st.floor % BLOCK_PALETTE.length]!,
  };
  st.blocks.push(newBlock);
  st.floor += 1;
  st.lastGrade = grade;

  if (grade === "perfect") {
    st.combo += 1;
    st.perfects += 1;
  } else if (grade === "great" || grade === "good") {
    st.combo += 1;
  } else {
    st.combo = 0;
  }
  st.maxCombo = Math.max(st.maxCombo, st.combo);

  const heightBonus = st.floor * 8;
  const comboBonus = st.combo * 12;
  st.score += GRADE_SCORE[grade] + heightBonus + comboBonus;
  st.tier = tierFromScore(st.score);
  st.cameraY = Math.max(0, newBlock.y - 28);
  st.mover = spawnMover(st.floor, overlapWidth, map, newCenter);
  return { collapsed: false, grade };
}

export function statsPublic(st: PlayerTowerStats) {
  return {
    floor: st.floor,
    score: st.score,
    combo: st.combo,
    maxCombo: st.maxCombo,
    alive: st.alive,
    finished: st.finished,
    collapsed: st.collapsed,
    rank: st.rank,
    tier: st.tier,
    blocks: st.blocks.slice(-24),
    mover: st.mover,
    lastGrade: st.lastGrade,
    tilt: st.tilt,
    perfects: st.perfects,
    cameraY: st.cameraY,
  };
}

export function assignRanks(
  stats: Record<string, PlayerTowerStats>,
  mode: TowerRushMode,
  finishOrder: string[]
) {
  const ids = Object.keys(stats);
  const sorted = [...ids].sort((a, b) => {
    const sa = stats[a]!;
    const sb = stats[b]!;
    if (mode === "battle_royale") {
      if (sa.alive !== sb.alive) return sa.alive ? -1 : 1;
    }
    if (sb.floor !== sa.floor) return sb.floor - sa.floor;
    if (sb.score !== sa.score) return sb.score - sa.score;
    return finishOrder.indexOf(a) - finishOrder.indexOf(b);
  });
  sorted.forEach((id, i) => {
    stats[id]!.rank = i + 1;
  });
}

export function buildTowerResultMessage(
  mode: TowerRushMode,
  stats: Record<string, PlayerTowerStats>,
  names: Record<string, string>,
  mapName: string
): { winnerId: string; resultMessage: string } {
  assignRanks(stats, mode, Object.keys(stats));
  const ranked = Object.entries(stats).sort(([, a], [, b]) => (a.rank ?? 99) - (b.rank ?? 99));
  const top = ranked[0];
  if (!top) return { winnerId: "", resultMessage: "게임 종료" };
  const [winnerId, wst] = top;
  const name = names[winnerId] ?? "플레이어";
  if (mode === "solo") {
    return {
      winnerId,
      resultMessage: `${mapName} · ${wst.floor}층 · ${wst.score.toLocaleString()}점 (${RANK_TIER_LABELS[wst.tier]})`,
    };
  }
  if (mode === "battle_royale") {
    return {
      winnerId,
      resultMessage: `배틀로얄 우승: ${name} · ${wst.floor}층 생존`,
    };
  }
  return {
    winnerId,
    resultMessage: `${name} 승리 · ${wst.floor}층 · ${wst.score.toLocaleString()}점`,
  };
}

export function shouldFinishTowerGame(
  mode: TowerRushMode,
  stats: Record<string, PlayerTowerStats>,
  playerCount: number
): boolean {
  if (mode === "solo") {
    return Object.values(stats).every((s) => !s.alive || s.finished);
  }
  if (mode === "battle_royale") {
    const alive = Object.values(stats).filter((s) => s.alive).length;
    return alive <= 1 && playerCount > 1;
  }
  if (mode === "duel" || mode === "ranked" || mode === "party") {
    return Object.values(stats).every((s) => !s.alive);
  }
  return false;
}
