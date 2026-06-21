export type ChibiHairStyle = 0 | 1 | 2 | 3 | 4 | 5;
export type ChibiEyeStyle = 0 | 1 | 2 | 3;
export type ChibiMouthStyle = 0 | 1 | 2 | 3;
export type ChibiTopStyle = 0 | 1 | 2;
export type ChibiBottomStyle = 0 | 1;
export type ChibiPose = "stand" | "sit" | "lie" | "lie_prone" | "run" | "wave";

export type ChibiAvatarConfig = {
  skinColor: string;
  hairColor: string;
  hairStyle: ChibiHairStyle;
  eyeStyle: ChibiEyeStyle;
  mouthStyle: ChibiMouthStyle;
  topColor: string;
  bottomColor: string;
  shoeColor: string;
  topStyle: ChibiTopStyle;
  bottomStyle: ChibiBottomStyle;
  blush: boolean;
};

export type BondeeFurnitureKind =
  | "bookshelf"
  | "sofa"
  | "tv_stand"
  | "coffee_table"
  | "floor_lamp"
  | "plant"
  | "treadmill"
  | "desk"
  | "bed"
  | "ac"
  | "clock"
  | "rug"
  | "washer"
  | "hoop"
  | "shelf_small"
  | "gramophone"
  | "refrigerator"
  | "computer"
  | "monitor"
  | "smartphone"
  | "window"
  | "mailbox"
  | "telephone"
  | "acoustic_guitar"
  | "electric_guitar"
  | "bass_guitar"
  | "violin"
  | "cello"
  | "harp"
  | "piano"
  | "upright_piano"
  | "grand_piano"
  | "synthesizer"
  | "marimba"
  | "drum_set"
  | "timpani"
  | "xylophone"
  | "accordion"
  | "pan_flute"
  | "ocarina"
  | "saxophone"
  | "trumpet"
  | "french_horn";

export type BondeePlacedItem = {
  id: string;
  kind: BondeeFurnitureKind;
  roomId: string;
  gx: number;
  gz: number;
  rot: 0 | 1 | 2 | 3;
  /** MoCoMo Studio GLB — set when placed from Studio inventory */
  studioAssetId?: string;
  glbUrl?: string;
  studioLabel?: string;
};

/** @deprecated alias — same as BondeeHomeState */
export type BondeeRoomState = BondeeHomeState;

export type BondeeHomeState = {
  avatar: ChibiAvatarConfig;
  items: BondeePlacedItem[];
  floorStyle: "wood" | "carpet";
  pose: ChibiPose;
  activeRoomId?: string;
  /** floor_lamp 등 가구 조명 on/off (itemId → true) */
  lightsOn?: Record<string, boolean>;
  /** 에어컨 on/off (itemId → false면 꺼짐, 미설정·true면 켜짐) */
  acOn?: Record<string, boolean>;
  /** 냉장고·창문 등 개폐 상태 (itemId → true면 열림) */
  furnitureOpen?: Record<string, boolean>;
  /** DIY 제작 완료 악기 (pan_flute, ocarina) */
  diyCrafted?: Partial<
    Record<
      | "pan_flute"
      | "ocarina"
      | "acoustic_guitar"
      | "electric_guitar"
      | "bass_guitar"
      | "violin"
      | "cello"
      | "harp"
      | "piano"
      | "upright_piano"
      | "grand_piano"
      | "synthesizer"
      | "marimba"
      | "drum_set"
      | "timpani"
      | "xylophone"
      | "accordion"
      | "saxophone"
      | "trumpet"
      | "french_horn",
      boolean
    >
  >;
  /** 집 정체성 — 태그·대표 공간·브랜딩 */
  identity?: import("@/lib/apt/home-identity").AptHomeIdentity;
};

export const DEFAULT_CHIBI_AVATAR: ChibiAvatarConfig = {
  skinColor: "#f5d0b5",
  hairColor: "#5c3d2e",
  hairStyle: 1,
  eyeStyle: 0,
  mouthStyle: 0,
  topColor: "#7a8a9a",
  bottomColor: "#4a5568",
  shoeColor: "#2a2a2a",
  topStyle: 1,
  bottomStyle: 0,
  blush: true,
};

export const DEFAULT_BONDEE_ROOM: BondeeHomeState = {
  avatar: DEFAULT_CHIBI_AVATAR,
  floorStyle: "wood",
  pose: "sit",
  activeRoomId: "living",
  items: [],
};

export const DEFAULT_BONDEE_HOME = DEFAULT_BONDEE_ROOM;

export const BONDEE_FURNITURE_LABELS: Record<BondeeFurnitureKind, string> = {
  bookshelf: "책꽂이",
  sofa: "소파",
  tv_stand: "TV",
  coffee_table: "테이블",
  floor_lamp: "조명",
  plant: "화분",
  treadmill: "런닝머신",
  desk: "책상",
  bed: "침대",
  ac: "에어컨",
  clock: "시계",
  rug: "러그",
  washer: "세탁기",
  hoop: "농구골",
  shelf_small: "선반",
  gramophone: "그라모폰",
  refrigerator: "냉장고",
  computer: "컴퓨터",
  monitor: "모니터",
  smartphone: "스마트폰",
  window: "창문",
  mailbox: "우편함",
  telephone: "전화기",
  acoustic_guitar: "어쿠스틱 기타",
  electric_guitar: "일렉트릭 기타",
  bass_guitar: "베이스 기타",
  violin: "바이올린",
  cello: "첼로",
  harp: "하프",
  piano: "피아노",
  upright_piano: "업라이트 피아노",
  grand_piano: "그랜드 피아노",
  synthesizer: "신시사이저",
  marimba: "마림바",
  drum_set: "드럼 세트",
  timpani: "팀파니",
  xylophone: "실로폰",
  accordion: "아코디언",
  pan_flute: "팬플루트",
  ocarina: "오카리나",
  saxophone: "색소폰",
  trumpet: "트럼펫",
  french_horn: "프렌치 호른",
};

export const BONDEE_FURNITURE_CATEGORIES: { label: string; kinds: BondeeFurnitureKind[] }[] = [
  { label: "가구", kinds: ["sofa", "bed", "desk", "bookshelf", "shelf_small", "window"] },
  {
    label: "가전",
    kinds: ["tv_stand", "refrigerator", "ac", "washer", "treadmill", "computer", "monitor", "smartphone"],
  },
  { label: "소품", kinds: ["coffee_table", "floor_lamp", "plant", "clock", "hoop", "gramophone", "mailbox", "telephone"] },
  {
    label: "악기",
    kinds: [
      "piano",
      "upright_piano",
      "grand_piano",
      "synthesizer",
      "acoustic_guitar",
      "electric_guitar",
      "bass_guitar",
      "violin",
      "cello",
      "harp",
      "marimba",
      "xylophone",
      "drum_set",
      "timpani",
      "accordion",
      "saxophone",
      "trumpet",
      "french_horn",
      "pan_flute",
      "ocarina",
    ],
  },
  { label: "바닥", kinds: ["rug"] },
];
