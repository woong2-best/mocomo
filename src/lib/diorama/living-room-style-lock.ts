/**
 * RC Sprint 1 — Living Room Style Lock (수치 고정)
 * 캔버스 기준: aspect 4/3, ref width 390px (@3x mobile)
 */
import type { StickerInstance } from "./sticker-types";
import { enrichInstanceFromCatalog } from "./sticker-instance-utils";

export type LivingCornerPreset = {
  id: string;
  label: string;
  backdropAssetId: string;
  defaultInstances: StickerInstance[];
};

export const LIVING_ROOM_STYLE_VERSION = "rc1-living-style-lock-v1";

/** 대표 조명 — 오후 햇살 단일 (다크모드 X) */
export const LIVING_ROOM_HERO_LIGHTING = {
  id: "afternoon-golden",
  windowAzimuth: 225,
  keyWarm: "#FFF4E6",
  ambientCream: "#FFF4E7",
} as const;

/** 카메라 Lock — 소파 히어로, 시선 좌하향 */
export const LIVING_ROOM_CAMERA_LOCK = {
  scale: 1.06,
  translateY: -2.5,
  focusX: 46,
  /** 첫 진입 시 미세 줌인 */
  enterScale: 0.98,
  enterDurationMs: 900,
} as const;

/** Negative space · 시선 흐름 (%) */
export const LIVING_ROOM_LAYOUT_LOCK = {
  /** 소파 중심 ↔ 러그 중심 Y 간격 ≈ 38px @390w */
  sofaToRugGapPct: 11,
  /** TV 벽 여백 (우측) */
  tvWallMarginPct: 12,
  /** Plant 정규화 높이 (0~1, 러그=0) */
  plantHeightNorm: 0.9,
  /** Lamp 정규화 높이 */
  lampHeightNorm: 1.3,
  /** 가구 면적 목표 */
  furnitureFillPct: 38,
  emptySpacePct: 62,
} as const;

export const LIVING_CORNER_ZONES = {
  sofa: { id: "sofa", label: "Sofa Corner", anchor: { x: 34, y: 57 } },
  tv: { id: "tv", label: "TV Corner", anchor: { x: 64, y: 37 } },
  coffee: { id: "coffee", label: "Coffee Table", anchor: { x: 47, y: 62 } },
  plant: { id: "plant", label: "Plant Corner", anchor: { x: 26, y: 48 } },
  lamp: { id: "lamp", label: "Lamp Corner", anchor: { x: 68, y: 43 } },
  rug: { id: "rug", label: "Rug Zone", anchor: { x: 50, y: 68 } },
} as const;

export type LivingCornerId = keyof typeof LIVING_CORNER_ZONES;

function inst(
  id: string,
  typeId: string,
  x: number,
  y: number,
  z: number,
  extra?: Partial<StickerInstance>
): StickerInstance {
  return enrichInstanceFromCatalog({
    id,
    typeId,
    x,
    y,
    zIndex: z,
    scale: 1,
    rotation: 0,
    draggable: true,
    ...extra,
  });
}

/**
 * RC-1 최종 레이아웃 — 6코너 + Story Layer
 * 20 items · 시선: 창(좌상) → 소파(히어로) → 테이블 → TV(우)
 */
export const LIVING_ROOM_RC1_INSTANCES: StickerInstance[] = [
  // Wall · 창밖 햇빛 앵커
  inst("corner-window", "window", 33, 28, 10, { scale: 0.66, draggable: false }),
  inst("corner-frame", "frame-small", 51, 24, 11, { scale: 0.48, rotation: -3, draggable: false }),

  // ⑥ Rug
  inst("corner-rug", "rug", 50, 68, 5, { scale: 0.68 }),

  // ① Sofa + 담요(쿠션) + 눌린 쿠션
  inst("corner-sofa", "sofa", 34, 57, 20, { scale: 0.78, rotation: -2 }),
  inst("corner-cushion-blanket", "cushion", 36, 54, 21, { scale: 0.52, rotation: 14 }),
  inst("corner-cushion-pressed", "cushion", 40, 56, 22, { scale: 0.4, rotation: -8 }),

  // ③ Coffee + Story
  inst("corner-coffee", "coffee-table", 47, 62, 23, { scale: 0.62 }),
  inst("corner-mug", "mug", 49, 60, 24, { scale: 0.44 }),
  inst("corner-books", "books", 45, 59, 24, { scale: 0.4, rotation: 12 }),
  inst("corner-remote", "remote", 51, 60, 24, { scale: 0.34 }),
  inst("corner-charger", "telephone", 53, 61, 24, { scale: 0.36, rotation: -20 }),

  // ② TV — 여백 12%+
  inst("corner-tv-console", "shelf", 64, 44, 14, { scale: 0.5 }),
  inst("corner-tv", "tv", 64, 37, 15, { scale: 0.66 }),
  inst("corner-gamepad", "gamepad", 66, 43, 16, { scale: 0.36 }),

  // ④ Plant
  inst("corner-plant", "plant", 26, 48, 18, { scale: 0.74 }),
  inst("corner-vase", "vase", 24, 56, 12, { scale: 0.4 }),

  // ⑤ Lamp + candle 간접광
  inst("corner-lamp", "lamp", 68, 43, 25, { scale: 0.58 }),
  inst("corner-candle", "candle", 66, 41, 26, { scale: 0.34 }),

  // Story — 러그 옆 슬리퍼 · 소파 팔잡이 잡지
  inst("corner-slippers", "slippers", 42, 71, 7, { scale: 0.44, rotation: -6 }),
  inst("corner-magazine", "magazine", 32, 55, 19, { scale: 0.38, rotation: -18 }),
];

export const LIVING_CORNER_STICKER_IDS: Record<LivingCornerId, string[]> = {
  sofa: ["corner-sofa", "corner-cushion-blanket", "corner-cushion-pressed", "corner-magazine", "corner-frame"],
  tv: ["corner-tv", "corner-tv-console", "corner-gamepad"],
  coffee: ["corner-coffee", "corner-mug", "corner-books", "corner-remote", "corner-charger"],
  plant: ["corner-plant", "corner-vase"],
  lamp: ["corner-lamp", "corner-candle"],
  rug: ["corner-rug", "corner-slippers"],
};

/** Art pass 대상 typeId (14 hero + story props) */
export const LIVING_ROOM_ART_PASS_TYPES = [
  "sofa",
  "rug",
  "coffee-table",
  "tv",
  "shelf",
  "plant",
  "lamp",
  "mug",
  "remote",
  "books",
  "cushion",
  "slippers",
  "magazine",
  "candle",
  "vase",
  "gamepad",
  "telephone",
  "frame-small",
  "window",
] as const;

export function isLivingRoomStyleLockLayout(instances: StickerInstance[]): boolean {
  if (instances.length < 16 || instances.length > 24) return false;
  return instances.some((s) => s.id === "corner-sofa") && !instances.some((s) => s.id === "sofa-main");
}

/** @deprecated */
export const isLivingCornerStyleLockLayout = isLivingRoomStyleLockLayout;
