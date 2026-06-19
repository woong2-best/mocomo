export type ChibiHairStyle = 0 | 1 | 2 | 3 | 4 | 5;
export type ChibiEyeStyle = 0 | 1 | 2 | 3;
export type ChibiMouthStyle = 0 | 1 | 2 | 3;
export type ChibiTopStyle = 0 | 1 | 2;
export type ChibiBottomStyle = 0 | 1;
export type ChibiPose = "stand" | "sit" | "lie" | "run" | "wave";

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
  | "shelf_small";

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
  bookshelf: "책장",
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
};

export const BONDEE_FURNITURE_CATEGORIES: { label: string; kinds: BondeeFurnitureKind[] }[] = [
  { label: "가구", kinds: ["sofa", "bed", "desk", "bookshelf", "shelf_small"] },
  { label: "가전", kinds: ["tv_stand", "ac", "washer", "treadmill"] },
  { label: "소품", kinds: ["coffee_table", "floor_lamp", "plant", "clock", "hoop"] },
  { label: "바닥", kinds: ["rug"] },
];
