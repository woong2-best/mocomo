import type { BondeeFurnitureKind, ChibiPose } from "./types";
import { INSTRUMENT_KINDS } from "./instruments/types";
import { COMMUNITY_FEED_PATH } from "@/lib/site-routes";

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
  refrigerator: [],
  computer: [],
  monitor: [],
  smartphone: [],
  window: [],
  mailbox: [],
  telephone: [],
  ...Object.fromEntries(INSTRUMENT_KINDS.map((k) => [k, [] as FurnitureArchitecture[]])) as Record<
    (typeof INSTRUMENT_KINDS)[number],
    FurnitureArchitecture[]
  >,
};

export type FurnitureInteractSpec = {
  /** E키 버튼에 표시할 동작 라벨 */
  label: string;
  poses: ChibiPose[];
  /** 설정 시 E키로 해당 페이지 이동 */
  href?: string;
  /** true면 E키로 우편함 글쓰기 시트 열기 */
  composeAction?: boolean;
  /** true면 첫 pose만 사용 (순환 없음) */
  singleAction?: boolean;
};

/** Bondee 가구 E키 상호작용 — gramophone은 별도 패널 */
export const FURNITURE_INTERACT: Partial<Record<BondeeFurnitureKind, FurnitureInteractSpec>> = {
  sofa: { label: "앉기", poses: ["sit"], singleAction: true },
  bed: { label: "잠자기", poses: ["lie"], singleAction: true },
  tv_stand: { label: "라이브 방송", poses: ["sit"], href: "/live", singleAction: true },
  desk: { label: "앉기", poses: ["sit"], singleAction: true },
  coffee_table: { label: "앉기", poses: ["sit"], singleAction: true },
  refrigerator: { label: "냉장고", poses: ["stand"], singleAction: true },
  computer: { label: "MoCoMo 열기", poses: ["sit"], href: COMMUNITY_FEED_PATH, singleAction: true },
  monitor: { label: "MoCoMo 열기", poses: ["sit"], href: COMMUNITY_FEED_PATH, singleAction: true },
  smartphone: { label: "스마트폰", poses: ["stand"], singleAction: true },
  ac: { label: "에어컨", poses: ["stand"], singleAction: true },
  floor_lamp: { label: "조명 켜기", poses: [], singleAction: true },
  plant: { label: "화분", poses: ["wave"], singleAction: true },
  window: { label: "창문", poses: ["stand"], singleAction: true },
  mailbox: { label: "글쓰기", poses: ["stand"], composeAction: true, singleAction: true },
  telephone: { label: "메시지 열기", poses: ["stand"], href: "/messages", singleAction: true },
  bookshelf: { label: "책꼂이", poses: ["stand"], singleAction: true },
  rug: { label: "쉬기", poses: ["lie_prone", "run"] },
  treadmill: { label: "운동", poses: ["run"], singleAction: true },
  hoop: { label: "운동", poses: ["run"], singleAction: true },
};

export function interactSpecForKind(kind: BondeeFurnitureKind): FurnitureInteractSpec | null {
  return FURNITURE_INTERACT[kind] ?? null;
}

/** 가구별 상호작용 감지 오프셋 (월드 좌표) */
export function interactAnchorOffset(kind: BondeeFurnitureKind, rot: number): { dx: number; dz: number } {
  const rad = (rot * Math.PI) / 2;
  switch (kind) {
    case "tv_stand":
      return { dx: 0.08 + Math.sin(rad) * 0.12, dz: 0.22 + Math.cos(rad) * 0.12 };
    case "sofa":
      return { dx: Math.sin(rad) * 0.1, dz: Math.cos(rad) * 0.18 };
    case "bed":
      return { dx: 0, dz: 0.05 };
    case "computer":
    case "monitor":
      return { dx: Math.sin(rad) * 0.14, dz: 0.2 + Math.cos(rad) * 0.1 };
    case "desk":
      return { dx: Math.sin(rad) * 0.1, dz: 0.16 + Math.cos(rad) * 0.08 };
    case "telephone":
      return { dx: Math.sin(rad) * 0.08, dz: 0.12 + Math.cos(rad) * 0.08 };
    default:
      return { dx: 0, dz: 0 };
  }
}

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
  const spec = interactSpecForKind(kind);
  if (spec?.poses.length) return spec.poses[0];
  const archs = architecturesForKind(kind);
  if (!archs.length) return null;
  return poseForArchitecture(archs[0]);
}
