import type { BondeeFurnitureKind, ChibiPose } from "./types";

/** 가구 상호작용 4종 아키텍처 */
export type FurnitureArchitecture = "sit" | "lie_on" | "lie_prone" | "exercise";

export const ARCHITECTURE_LABELS: Record<FurnitureArchitecture, string> = {
  sit: "앉기",
  lie_on: "눕기",
  lie_prone: "엎드리기",
  exercise: "체조",
};

/** lie_on 이 있으면 lie_prone 도 자동 허용 */
export function expandArchitectures(archs: FurnitureArchitecture[]): FurnitureArchitecture[] {
  const set = new Set(archs);
  if (set.has("lie_on")) set.add("lie_prone");
  return [...set];
}

export const FURNITURE_ARCHITECTURES: Record<BondeeFurnitureKind, FurnitureArchitecture[]> = {
  sofa: ["sit", "lie_on"],
  bed: ["lie_on"],
  desk: ["sit"],
  coffee_table: ["sit"],
  rug: ["lie_prone", "exercise"],
  treadmill: ["exercise"],
  hoop: ["exercise"],
  bookshelf: [],
  tv_stand: [],
  floor_lamp: [],
  plant: [],
  ac: [],
  clock: [],
  washer: [],
  shelf_small: [],
  gramophone: [],
};

export function architecturesForKind(kind: BondeeFurnitureKind): FurnitureArchitecture[] {
  return expandArchitectures(FURNITURE_ARCHITECTURES[kind] ?? []);
}

export function poseForArchitecture(arch: FurnitureArchitecture): ChibiPose {
  switch (arch) {
    case "sit":
      return "sit";
    case "lie_on":
      return "lie";
    case "lie_prone":
      return "lie_prone";
    case "exercise":
      return "run";
  }
}

export function posesForArchitectures(archs: FurnitureArchitecture[]): ChibiPose[] {
  const poses = new Set<ChibiPose>();
  for (const arch of expandArchitectures(archs)) {
    poses.add(poseForArchitecture(arch));
  }
  return [...poses];
}

export function preferredPoseForKind(kind: BondeeFurnitureKind): ChibiPose | null {
  const archs = architecturesForKind(kind);
  if (!archs.length) return null;
  return poseForArchitecture(archs[0]);
}
