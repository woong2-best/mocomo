import type {
  AvatarFaceParams,
  AvatarMakeupParams,
  BackgroundId,
  FaceShape,
  GenderExpression,
  MotionId,
  OutfitPreset,
  RenderQuality,
} from "@/lib/virtual-avatar/types";

export const RENDER_QUALITIES: { id: RenderQuality; label: string; hint: string }[] = [
  { id: "performance", label: "경량", hint: "방송·저사양" },
  { id: "studio", label: "스튜디오", hint: "기본 고품질" },
  { id: "cinematic", label: "시네마", hint: "최고 품질" },
];

export const SKIN_TONES = [
  { label: "밝은", hex: "#fde8d8" },
  { label: "연한", hex: "#f5d0b5" },
  { label: "자연", hex: "#e8b896" },
  { label: "중간", hex: "#c68658" },
  { label: "깊은", hex: "#8d5524" },
  { label: "진한", hex: "#5c3317" },
  { label: "라벤더", hex: "#d4b8e8" },
  { label: "민트", hex: "#b8e8d4" },
  { label: "블루", hex: "#b8cce8" },
  { label: "실버", hex: "#c8d0d8" },
] as const;

export const TOP_COLORS = [
  "#3b82f6",
  "#06b6d4",
  "#22c55e",
  "#eab308",
  "#f97316",
  "#ec4899",
  "#6366f1",
  "#f8fafc",
] as const;

export const HAIR_COLORS = [
  { label: "검정", hex: "#1a1a1a" },
  { label: "갈색", hex: "#5c4033" },
  { label: "금발", hex: "#d4a853" },
  { label: "적갈", hex: "#8b3a2a" },
  { label: "은색", hex: "#b0b8c0" },
  { label: "핑크", hex: "#f472b6" },
  { label: "보라", hex: "#a855f7" },
  { label: "청록", hex: "#14b8a6" },
  { label: "네온", hex: "#22d3ee" },
  { label: "레인보", hex: "linear" },
] as const;

export const EYE_COLORS = [
  { label: "초록", hex: "#4a6741" },
  { label: "갈색", hex: "#6b4423" },
  { label: "블루", hex: "#3b82c4" },
  { label: "그레이", hex: "#94a3b8" },
  { label: "헤zel", hex: "#a16207" },
  { label: "보라", hex: "#7c3aed" },
  { label: "핑크", hex: "#ec4899" },
  { label: "골드", hex: "#ca8a04" },
  { label: "레드", hex: "#dc2626" },
  { label: "사이버", hex: "#22d3ee" },
] as const;

export const LIP_COLORS = [
  { label: "로즈", hex: "#e879a0" },
  { label: "코랄", hex: "#fb7185" },
  { label: "레드", hex: "#ef4444" },
  { label: "베리", hex: "#be123c" },
  { label: "피치", hex: "#fda4af" },
  { label: "누드", hex: "#d4a574" },
  { label: "플럼", hex: "#9333ea" },
  { label: "오렌지", hex: "#f97316" },
] as const;

export const FACE_SHAPES: { id: FaceShape; label: string }[] = [
  { id: "oval", label: "타원" },
  { id: "round", label: "둥근" },
  { id: "heart", label: "하트" },
  { id: "square", label: "각진" },
  { id: "long", label: "긴" },
  { id: "diamond", label: "다이아" },
];

/** ZEPETO式 원터치 얼굴 프리셋 */
export const FACE_QUICK_PRESETS: {
  id: string;
  label: string;
  patch: Partial<Omit<AvatarFaceParams, "makeup">> & { makeup?: Partial<AvatarMakeupParams> };
}[] = [
  {
    id: "cute",
    label: "귀여움",
    patch: {
      faceShape: "round",
      eyeSize: 68,
      eyeSpacing: 46,
      jawWidth: 42,
      chinLength: 44,
      lipThickness: 52,
      makeup: { blushIntensity: 48, lipstick: 35, eyeshadow: 28, eyeliner: 20, mascara: 32, contour: 10, highlight: 28, lipColorIndex: 4 },
    },
  },
  {
    id: "cool",
    label: "쿨",
    patch: {
      faceShape: "diamond",
      eyeSize: 54,
      eyeTilt: 58,
      jawAngle: 58,
      noseBridge: 55,
      browThickness: 52,
      makeup: { blushIntensity: 18, lipstick: 28, eyeliner: 42, contour: 32, highlight: 15, lipColorIndex: 5 },
    },
  },
  {
    id: "mature",
    label: "성숙",
    patch: {
      faceShape: "oval",
      eyeSize: 50,
      chinLength: 56,
      cheekbone: 58,
      noseHeight: 54,
      makeup: { blushIntensity: 22, lipstick: 48, contour: 28, eyeliner: 30, lipColorIndex: 1 },
    },
  },
  {
    id: "anime",
    label: "애니",
    patch: {
      faceShape: "heart",
      eyeSize: 72,
      pupilSize: 58,
      doubleEyelid: 75,
      jawWidth: 38,
      eyeColorIndex: 5,
      makeup: { eyeshadow: 35, mascara: 45, blushIntensity: 40, lipstick: 32, lipColorIndex: 2 },
    },
  },
];

export const GENDER_OPTIONS: { id: GenderExpression; label: string }[] = [
  { id: "female", label: "여성형" },
  { id: "male", label: "남성형" },
  { id: "neutral", label: "중성" },
];

export const OUTFIT_PRESETS: { id: OutfitPreset; label: string; emoji: string }[] = [
  { id: "casual", label: "케주얼", emoji: "👕" },
  { id: "dressy", label: "드레시", emoji: "👗" },
  { id: "office", label: "오피스", emoji: "💼" },
  { id: "game", label: "게임 캐릭터", emoji: "🎮" },
  { id: "fantasy", label: "판타지", emoji: "🧙" },
  { id: "cyberpunk", label: "사이버펑크", emoji: "🤖" },
];

export const HAIR_STYLES = [
  "단발",
  "긴 생머리",
  "포니테일",
  "트윈테일",
  "숏컷",
  "웨이브",
  "땋은 머리",
  "뾰족",
] as const;

export const MOTIONS: { id: MotionId; label: string }[] = [
  { id: "idle", label: "기본" },
  { id: "wave", label: "손흔들기" },
  { id: "dance", label: "댄스" },
  { id: "talk", label: "말하기" },
  { id: "smile", label: "웃음" },
  { id: "bow", label: "인사" },
];

export const PARTICLE_EFFECTS = [
  { id: "none" as const, label: "없음" },
  { id: "glitter" as const, label: "글리터" },
  { id: "hearts" as const, label: "하트" },
  { id: "stars" as const, label: "별" },
  { id: "fireworks" as const, label: "불꽃" },
];

export const BACKGROUNDS: { id: BackgroundId; label: string }[] = [
  { id: "space", label: "우주" },
  { id: "pink", label: "분홍" },
  { id: "cyber", label: "사이버" },
  { id: "nature", label: "자연" },
  { id: "solid", label: "단색" },
];

export const OUTFIT_LAYER_LABELS = [
  { key: "top" as const, label: "상의" },
  { key: "bottom" as const, label: "하의" },
  { key: "shoes" as const, label: "신발" },
  { key: "headwear" as const, label: "헤드웨어" },
  { key: "accessories" as const, label: "액세서리" },
];

export function adjustSkinColor(hex: string, brightness: number, saturation: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const br = (brightness - 50) / 50;
  const sat = 0.5 + saturation / 100;
  const nr = Math.min(255, Math.max(0, Math.round((r + br * 40) * sat)));
  const ng = Math.min(255, Math.max(0, Math.round((g + br * 40) * sat)));
  const nb = Math.min(255, Math.max(0, Math.round((b + br * 40) * sat)));
  return `rgb(${nr},${ng},${nb})`;
}

export function getOutfitBottomColor(preset: OutfitPreset, topColor: string): string {
  switch (preset) {
    case "dressy":
      return topColor;
    case "office":
      return "#334155";
    case "game":
      return "#1e293b";
    case "fantasy":
      return "#4c1d95";
    case "cyberpunk":
      return "#0f172a";
    default:
      return topColor;
  }
}

export function getOutfitAccent(preset: OutfitPreset): string {
  switch (preset) {
    case "dressy":
      return "#fbbf24";
    case "office":
      return "#64748b";
    case "game":
      return "#22c55e";
    case "fantasy":
      return "#c084fc";
    case "cyberpunk":
      return "#f472b6";
    default:
      return "#ffffff";
  }
}
