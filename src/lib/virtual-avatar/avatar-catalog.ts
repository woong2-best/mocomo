import type { AvatarConfig, AvatarEquippedItems, AvatarFaceParams, AvatarMakeupParams, OutfitPreset, ShopCategory } from "@/lib/virtual-avatar/types";

export type CatalogTag = "hot" | "new" | "free";

export type AttachmentBone =
  | "head"
  | "neck"
  | "chest"
  | "spine"
  | "hips"
  | "leftFoot"
  | "rightFoot"
  | "leftHand"
  | "rightHand"
  | "leftUpperArm"
  | "rightUpperArm";

export type CatalogAttachment = {
  template: string;
  bone: AttachmentBone;
  glbUrl?: string;
  scale?: number;
  offset?: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
};

export type CatalogAppearance = {
  hairStyle?: number;
  hairColorIndex?: number;
  outfitPreset?: OutfitPreset;
  topColor?: string;
  bottomColor?: string;
  accentColor?: string;
  facePatch?: Partial<AvatarFaceParams>;
  makeupPatch?: Partial<AvatarMakeupParams>;
  attachment?: CatalogAttachment;
};

export type CatalogItem = {
  id: string;
  name: string;
  category: Exclude<ShopCategory, "all">;
  price: number;
  tags?: CatalogTag[];
  previewFrom: string;
  previewTo?: string;
  emoji?: string;
  appearance: CatalogAppearance;
};

const HAIR_NAMES = [
  "실크 롱 웨이브",
  "청순 단발",
  "하이 포니테일",
  "트윈테일 리본",
  "시크 숏컷",
  "볼륨 웨이브",
  "사이드 브레이드",
  "울프컷 레이어",
  "허쉬컷",
  "투블럭",
  "픽시컷",
  "롱 스트레이트",
  "반묶음",
  "올림머리",
  "커튼 뱅",
  "층 레이어",
  "내추럴 컬",
  "듀라롱",
  "사이버 네온",
  "핑크 그라데이션",
  "실버 밥",
  "투톤 하이라이트",
  "프린세스 컬",
  "보헤미안 웨이브",
];

const TOP_NAMES = [
  "데일리 티셔츠",
  "오버핏 후드",
  "크롭 니트",
  "셔츠 블라우스",
  "스포츠 재킷",
  "가디건",
  "레ather 재킷",
  "프릴 블라우스",
  "사이버 재킷",
  "오프숄더",
];

const BOTTOM_NAMES = [
  "데님 팬츠",
  "미니 스커트",
  "와이드 슬랙",
  "쇼츠",
  "플리츠 스커트",
  "카고 팬츠",
  "레ggings",
  "하이웨스트",
];

const FULL_OUTFIT_NAMES = [
  "핑크 크롭 세트",
  "데님 원피스",
  "오피스 수트",
  "판타지 로브",
  "사이버 수트",
  "파티 드레스",
  "스포츠 세트",
  "코지 파자마",
];

const SHOE_NAMES = ["스니커즈", "하이탑", "로퍼", "부츠", "샌들", "플랫"];
const HEADWEAR_NAMES = ["캡", "비니", "헤드폰", "왕관", "고양이 귀", "베레모"];
const ACCESSORY_NAMES = ["목걸이", "안경", "마스크", "날개", "꼬리", "반지"];
const MAKEUP_NAMES = ["내추럴", "글램", "코랄", "스모키", "페어리", "네온"];

const HAIR_GRADIENTS: [string, string][] = [
  ["#2a1810", "#1a1a1a"],
  ["#5c4033", "#3d2817"],
  ["#d4a853", "#f5e6c8"],
  ["#8b3a2a", "#c45c3e"],
  ["#b0b8c0", "#e8ecf0"],
  ["#f472b6", "#fda4af"],
  ["#a855f7", "#c084fc"],
  ["#14b8a6", "#5eead4"],
  ["#22d3ee", "#67e8f9"],
  ["#6366f1", "#a5b4fc"],
  ["#1a1a1a", "#4a3728"],
  ["#fde68a", "#f59e0b"],
  ["#ec4899", "#8b5cf6"],
  ["#78716c", "#d6d3d1"],
  ["#0ea5e9", "#38bdf8"],
  ["#84cc16", "#bef264"],
  ["#ef4444", "#fca5a5"],
  ["#7c3aed", "#ddd6fe"],
  ["#0891b2", "#22d3ee"],
  ["#db2777", "#fbcfe8"],
  ["#475569", "#94a3b8"],
  ["#ca8a04", "#fef08a"],
  ["#be123c", "#fda4af"],
  ["#059669", "#6ee7b7"],
];

const TOP_COLORS = [
  "#3b82f6",
  "#ec4899",
  "#22c55e",
  "#f97316",
  "#6366f1",
  "#14b8a6",
  "#eab308",
  "#f8fafc",
  "#0f172a",
  "#a855f7",
];

const HAIR_TEMPLATES = [
  "long_wave", "bob", "ponytail", "twintail", "short", "volume", "braid", "wolf",
  "hime", "pixie", "half_up", "updo", "curtain_bangs", "layered", "natural", "durag_long",
  "cyber", "gradient", "silver_bob", "two_tone", "princess", "bohemian", "long_wave", "twintail",
];
const TOP_TEMPLATES = ["tee", "hoodie", "crop", "blouse", "jacket", "cardigan", "leather", "frill", "cyber_top", "offshoulder"];
const BOTTOM_TEMPLATES = ["denim", "mini_skirt", "slacks", "shorts", "pleats", "cargo", "leggings", "highwaist"];
const FULL_TEMPLATES = ["dress", "dress", "suit", "fantasy", "cyber_suit", "party", "sport", "cozy"];
const SHOES_TEMPLATES = ["sneaker", "hightop", "loafer", "boots", "sandal", "flat"];
const HEAD_TEMPLATES = ["cap", "beanie", "headphones", "crown", "cat_ears", "beret"];
const ACC_TEMPLATES = ["necklace", "glasses", "mask", "wings", "tail", "ring"];

function partUrl(category: string, id: string) {
  return `/avatars/parts/${category}/${id}.glb`;
}

function hairItem(i: number): CatalogItem {
  const [from, to] = HAIR_GRADIENTS[i % HAIR_GRADIENTS.length];
  const free = i < 3;
  const id = `hair_${String(i + 1).padStart(3, "0")}`;
  return {
    id,
    name: HAIR_NAMES[i] ?? `헤어 ${i + 1}`,
    category: "hair",
    price: free ? 0 : 4 + (i % 8),
    tags: free ? ["free"] : i % 5 === 0 ? ["hot"] : i % 7 === 0 ? ["new"] : undefined,
    previewFrom: from,
    previewTo: to,
    emoji: "💇",
    appearance: {
      hairStyle: i,
      hairColorIndex: i % 10,
      attachment: {
        template: HAIR_TEMPLATES[i] ?? "long_wave",
        bone: "head",
        glbUrl: partUrl("hair", id),
        offset: { x: 0, y: 0.06, z: 0 },
        scale: 1,
      },
    },
  };
}

function topItem(i: number): CatalogItem {
  const color = TOP_COLORS[i % TOP_COLORS.length];
  const free = i === 0;
  const id = `top_${String(i + 1).padStart(3, "0")}`;
  return {
    id,
    name: TOP_NAMES[i] ?? `상의 ${i + 1}`,
    category: "top",
    price: free ? 0 : 5 + (i % 6),
    tags: free ? ["free"] : i === 2 ? ["hot"] : undefined,
    previewFrom: color,
    previewTo: "#ffffff22",
    emoji: "👕",
    appearance: {
      topColor: color,
      outfitPreset: "casual",
      attachment: {
        template: TOP_TEMPLATES[i] ?? "tee",
        bone: "chest",
        glbUrl: partUrl("top", id),
        offset: { x: 0, y: -0.02, z: 0 },
      },
    },
  };
}

function bottomItem(i: number): CatalogItem {
  const colors = ["#334155", "#1e293b", "#475569", "#64748b", "#0f172a", "#374151", "#4c1d95", "#831843"];
  const color = colors[i % colors.length];
  const free = i === 0;
  const id = `bottom_${String(i + 1).padStart(3, "0")}`;
  return {
    id,
    name: BOTTOM_NAMES[i] ?? `하의 ${i + 1}`,
    category: "bottom",
    price: free ? 0 : 4 + (i % 5),
    tags: free ? ["free"] : undefined,
    previewFrom: color,
    emoji: "👖",
    appearance: {
      bottomColor: color,
      attachment: {
        template: BOTTOM_TEMPLATES[i] ?? "denim",
        bone: "hips",
        glbUrl: partUrl("bottom", id),
        offset: { x: 0, y: -0.05, z: 0 },
      },
    },
  };
}

function fullOutfitItem(i: number): CatalogItem {
  const presets: OutfitPreset[] = ["casual", "dressy", "office", "fantasy", "cyberpunk", "game", "casual", "dressy"];
  const colors = ["#ec4899", "#3b82f6", "#334155", "#7c3aed", "#22d3ee", "#f472b6", "#22c55e", "#eab308"];
  const id = `full_${String(i + 1).padStart(3, "0")}`;
  return {
    id,
    name: FULL_OUTFIT_NAMES[i] ?? `한벌 ${i + 1}`,
    category: "fullOutfit",
    price: 8 + (i % 6),
    tags: i === 0 ? ["hot", "new"] : i === 3 ? ["new"] : undefined,
    previewFrom: colors[i],
    previewTo: "#ffffff33",
    emoji: "👗",
    appearance: {
      outfitPreset: presets[i],
      topColor: colors[i],
      bottomColor: colors[i],
      accentColor: "#ffffff",
      attachment: {
        template: FULL_TEMPLATES[i] ?? "dress",
        bone: "chest",
        glbUrl: partUrl("fullOutfit", id),
        offset: { x: 0, y: -0.08, z: 0 },
      },
    },
  };
}

function shoesItem(i: number): CatalogItem {
  const free = i === 0;
  const id = `shoes_${String(i + 1).padStart(3, "0")}`;
  return {
    id,
    name: SHOE_NAMES[i] ?? `신발 ${i + 1}`,
    category: "shoes",
    price: free ? 0 : 3 + (i % 4),
    tags: free ? ["free"] : undefined,
    previewFrom: i % 2 === 0 ? "#f8fafc" : "#1a1a1a",
    emoji: "👟",
    appearance: {
      accentColor: i % 2 === 0 ? "#ffffff" : "#334155",
      attachment: {
        template: SHOES_TEMPLATES[i] ?? "sneaker",
        bone: "leftFoot",
        glbUrl: partUrl("shoes", id),
        offset: { x: 0, y: -0.04, z: 0.04 },
      },
    },
  };
}

function headwearItem(i: number): CatalogItem {
  const id = `head_${String(i + 1).padStart(3, "0")}`;
  return {
    id,
    name: HEADWEAR_NAMES[i] ?? `헤드웨어 ${i + 1}`,
    category: "headwear",
    price: 3 + (i % 5),
    tags: i === 4 ? ["hot"] : undefined,
    previewFrom: ["#ef4444", "#1a1a1a", "#6366f1", "#fbbf24", "#f472b6", "#78716c"][i],
    emoji: "🎩",
    appearance: {
      accentColor: "#fbbf24",
      attachment: {
        template: HEAD_TEMPLATES[i] ?? "cap",
        bone: "head",
        glbUrl: partUrl("headwear", id),
        offset: { x: 0, y: 0.1, z: 0 },
      },
    },
  };
}

function accessoryItem(i: number): CatalogItem {
  const id = `acc_${String(i + 1).padStart(3, "0")}`;
  const bones: CatalogAttachment["bone"][] = ["neck", "head", "head", "chest", "hips", "leftHand"];
  return {
    id,
    name: ACCESSORY_NAMES[i] ?? `액세서리 ${i + 1}`,
    category: "accessory",
    price: 2 + (i % 6),
    tags: i === 3 ? ["new"] : undefined,
    previewFrom: ["#fbbf24", "#64748b", "#94a3b8", "#c084fc", "#22d3ee", "#f472b6"][i],
    emoji: "✨",
    appearance: {
      accentColor: "#fbbf24",
      attachment: {
        template: ACC_TEMPLATES[i] ?? "necklace",
        bone: bones[i] ?? "neck",
        glbUrl: partUrl("accessory", id),
      },
    },
  };
}

function makeupItem(i: number): CatalogItem {
  const patches: Partial<AvatarMakeupParams>[] = [
    { eyeshadow: 15, eyeliner: 20, lipstick: 25, blushIntensity: 30 },
    { eyeshadow: 55, eyeliner: 60, lipstick: 70, blushIntensity: 45, highlight: 50 },
    { eyeshadow: 35, lipstick: 65, lipColorIndex: 4, blushIntensity: 55 },
    { eyeshadow: 80, eyeliner: 75, contour: 60, lipstick: 40 },
    { eyeshadow: 45, blushIntensity: 70, highlight: 65, lipColorIndex: 1 },
    { eyeshadow: 90, eyeliner: 85, lipstick: 85, lipColorIndex: 6, highlight: 80 },
  ];
  const free = i === 0;
  return {
    id: `makeup_${String(i + 1).padStart(3, "0")}`,
    name: MAKEUP_NAMES[i] ?? `메이크업 ${i + 1}`,
    category: "makeup",
    price: free ? 0 : 5 + (i % 4),
    tags: free ? ["free"] : i === 1 ? ["hot"] : undefined,
    previewFrom: ["#fda4af", "#f472b6", "#fb7185", "#475569", "#fbcfe8", "#22d3ee"][i],
    previewTo: "#ffffff55",
    emoji: "💄",
    appearance: { makeupPatch: patches[i] },
  };
}

export const AVATAR_CATALOG: CatalogItem[] = [
  ...Array.from({ length: 24 }, (_, i) => hairItem(i)),
  ...Array.from({ length: 10 }, (_, i) => topItem(i)),
  ...Array.from({ length: 8 }, (_, i) => bottomItem(i)),
  ...Array.from({ length: 8 }, (_, i) => fullOutfitItem(i)),
  ...Array.from({ length: 6 }, (_, i) => shoesItem(i)),
  ...Array.from({ length: 6 }, (_, i) => headwearItem(i)),
  ...Array.from({ length: 6 }, (_, i) => accessoryItem(i)),
  ...Array.from({ length: 6 }, (_, i) => makeupItem(i)),
];

export const CATALOG_BY_ID = new Map(AVATAR_CATALOG.map((item) => [item.id, item]));

export const SHOP_CATEGORY_LABELS: { id: ShopCategory; label: string; emoji: string }[] = [
  { id: "all", label: "전체", emoji: "✨" },
  { id: "hair", label: "헤어", emoji: "💇" },
  { id: "fullOutfit", label: "한벌", emoji: "👗" },
  { id: "top", label: "상의", emoji: "👕" },
  { id: "bottom", label: "하의", emoji: "👖" },
  { id: "headwear", label: "모자", emoji: "🧢" },
  { id: "shoes", label: "신발", emoji: "👟" },
  { id: "accessory", label: "액세", emoji: "💎" },
  { id: "makeup", label: "메이크업", emoji: "💄" },
];

export const SHOP_FILTER_TABS = [
  { id: "my" as const, label: "착용", emoji: "✓" },
  { id: "wish" as const, label: "♥", emoji: "♥" },
  { id: "hot" as const, label: "HOT", emoji: "🔥" },
  { id: "new" as const, label: "NEW", emoji: "N" },
];


export function getCatalogItem(id: string): CatalogItem | undefined {
  return CATALOG_BY_ID.get(id);
}

export function applyEquippedToConfig(
  equipped: AvatarEquippedItems,
  base: AvatarConfig
): AvatarConfig {
  const next: AvatarConfig = { ...base, equipped };

  const full = equipped.fullOutfitId ? getCatalogItem(equipped.fullOutfitId) : null;
  if (full?.appearance) {
    next.outfit = {
      ...base.outfit,
      preset: full.appearance.outfitPreset ?? base.outfit.preset,
      topColor: full.appearance.topColor ?? base.outfit.topColor,
      bottomColor: full.appearance.bottomColor ?? base.outfit.bottomColor,
      accentColor: full.appearance.accentColor ?? base.outfit.accentColor,
      layers: { top: true, bottom: true, shoes: true, accessories: true, headwear: true },
    };
    return next;
  }

  const hair = getCatalogItem(equipped.hairId);
  if (hair?.appearance) {
    next.hair = {
      ...base.hair,
      style: hair.appearance.hairStyle ?? base.hair.style,
      colorIndex: hair.appearance.hairColorIndex ?? base.hair.colorIndex,
    };
  }

  const top = getCatalogItem(equipped.topId);
  const bottom = getCatalogItem(equipped.bottomId);
  const shoes = getCatalogItem(equipped.shoesId);
  next.outfit = {
    ...base.outfit,
    preset: top?.appearance.outfitPreset ?? base.outfit.preset,
    topColor: top?.appearance.topColor ?? base.outfit.topColor,
    bottomColor: bottom?.appearance.bottomColor ?? base.outfit.bottomColor,
    accentColor: shoes?.appearance.accentColor ?? base.outfit.accentColor,
    layers: {
      ...base.outfit.layers,
      accessories: !!equipped.accessoryId,
      headwear: !!equipped.headwearId,
    },
  };

  const makeup = equipped.makeupId ? getCatalogItem(equipped.makeupId) : null;
  if (makeup?.appearance.makeupPatch) {
    next.face = {
      ...base.face,
      makeup: { ...base.face.makeup, ...makeup.appearance.makeupPatch },
    };
  }

  return next;
}

export function equipItem(
  equipped: AvatarEquippedItems,
  item: CatalogItem
): AvatarEquippedItems {
  const next: AvatarEquippedItems = { ...equipped };
  if (item.category !== "fullOutfit") next.fullOutfitId = null;
  switch (item.category) {
    case "hair":
      next.hairId = item.id;
      break;
    case "top":
      next.topId = item.id;
      break;
    case "bottom":
      next.bottomId = item.id;
      break;
    case "shoes":
      next.shoesId = item.id;
      break;
    case "headwear":
      next.headwearId = item.id;
      break;
    case "accessory":
      next.accessoryId = item.id;
      break;
    case "fullOutfit":
      next.fullOutfitId = item.id;
      break;
    case "makeup":
      next.makeupId = item.id;
      break;
  }
  return next;
}
