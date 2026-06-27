/** 스티커 다이오라마 — 개별 PNG/WebP 오브젝트 배치 시스템 */

export type StickerCategory =
  | "room"
  | "furniture"
  | "decor"
  | "lighting"
  | "character"
  | "prop"
  | "functional";

/** MoCoMo 공간 UI — 가구 터치 시 열리는 기능 */
export type StickerFunction =
  | "live-tv"
  | "mailbox"
  | "phone"
  | "community"
  | "avatar-edit"
  | "profile-edit"
  | "room-portal"
  | "exit-corridor";

export type StickerAssetDef = {
  id: string;
  src: string;
  label: string;
  defaultWidth: number;
  category: StickerCategory;
  /** 기능 진입점 — 장식이 아닌 공간 UI */
  function?: StickerFunction;
  functionLabel?: string;
};

/** 유저별 저장·렌더링 단위 */
export type StickerInstance = {
  id: string;
  typeId: string;
  x: number;
  y: number;
  zIndex: number;
  rotation?: number;
  scale?: number;
  linkTo?: string;
  draggable: boolean;
};

/** @deprecated 프리셋 초기값용 — StickerInstance로 마이그레이션 중 */
export type PlacedSticker = {
  id: string;
  assetId: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  zIndex: number;
};

export type DioramaScenePreset = {
  id: string;
  label: string;
  backdropAssetId: string;
  /** 신규 유저 기본 배치 */
  defaultInstances: StickerInstance[];
};

/** room-shell 이미지 내부 안전 영역 (%) */
export const DIORAMA_ZONES = {
  leftWall: { x: [30, 42] as const, y: [24, 46] as const },
  rightWall: { x: [58, 72] as const, y: [24, 46] as const },
  backWall: { x: [38, 62] as const, y: [20, 32] as const },
  floor: { x: [32, 68] as const, y: [50, 76] as const },
};
