export type BuildTool =
  | "foundation"
  | "wall"
  | "floor"
  | "roof"
  | "door"
  | "window"
  | "fence"
  | "tree"
  | "lamp"
  | "garage"
  | "stairs"
  | "pillar"
  | "pool"
  | "sofa"
  | "bed"
  | "table"
  | "chimney"
  | "balcony"
  | "mailbox"
  | "driveway"
  | "erase";

export type BuildPiece = {
  id: string;
  kind: Exclude<BuildTool, "erase">;
  gx: number;
  gz: number;
  gy: number;
  rot: 0 | 1 | 2 | 3;
};

export type HouseBuildState = {
  pieces: BuildPiece[];
  plotHalf: number;
  worldSeed: number;
  timeOfDay: number;
};

export type HouseWorldMode = "build" | "explore" | "drive" | "avatar" | "interior";

export type OutdoorActivity = "idle" | "walk" | "sit" | "wave";

export const BUILD_TOOL_LABELS: Record<BuildTool, string> = {
  foundation: "기초",
  wall: "벽",
  floor: "바닥",
  roof: "지붕",
  door: "문",
  window: "창문",
  fence: "울타리",
  tree: "나무",
  lamp: "가로등",
  garage: "차고",
  stairs: "계단",
  pillar: "기둥",
  pool: "수영장",
  sofa: "소파",
  bed: "침대",
  table: "테이블",
  chimney: "굴뚝",
  balcony: "발코니",
  mailbox: "우편함",
  driveway: "진입로",
  erase: "삭제",
};

export const BUILD_TOOL_GROUPS = {
  structure: ["foundation", "wall", "floor", "roof", "door", "window", "stairs", "pillar", "chimney", "balcony"] as BuildTool[],
  outdoor: ["fence", "tree", "lamp", "garage", "pool", "mailbox", "driveway"] as BuildTool[],
  furniture: ["sofa", "bed", "table"] as BuildTool[],
};

export const PLOT_HALF_DEFAULT = 5.5;
export const GRID_UNIT = 1;
export const WORLD_SIZE = 128;

export function emptyHouseBuild(plotHalf = PLOT_HALF_DEFAULT, seed = 42): HouseBuildState {
  return { pieces: [], plotHalf, worldSeed: seed, timeOfDay: 14 };
}

export function seedFromCoords(lat: number, lng: number) {
  return Math.abs(Math.floor(lat * 1000 + lng * 777)) % 100000;
}

export function canEnterInterior(pieces: BuildPiece[]) {
  const walls = pieces.filter((p) => p.kind === "wall").length;
  const floors = pieces.filter((p) => p.kind === "floor" || p.kind === "foundation").length;
  const doors = pieces.filter((p) => p.kind === "door").length;
  return (walls >= 3 && floors >= 2) || doors >= 1;
}
