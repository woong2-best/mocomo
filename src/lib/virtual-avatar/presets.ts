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
import { FACE_SHAPE_LABELS } from "@/lib/virtual-avatar/face-shape-profiles";

export const RENDER_QUALITIES: { id: RenderQuality; label: string; hint: string }[] = [
  { id: "performance", label: "Lightweight", hint: "Streaming · low spec" },
  { id: "studio", label: "스튜디오", hint: "Default high quality" },
  { id: "cinematic", label: "Cinema", hint: "Maximum quality" },
];

export const SKIN_TONES = [
  { label: "Bright", hex: "#fde8d8" },
  { label: "Light", hex: "#f5d0b5" },
  { label: "Natural", hex: "#e8b896" },
  { label: "Medium", hex: "#c68658" },
  { label: "Deep", hex: "#8d5524" },
  { label: "Dark", hex: "#5c3317" },
  { label: "Lavender", hex: "#d4b8e8" },
  { label: "Mint", hex: "#b8e8d4" },
  { label: "Blue", hex: "#b8cce8" },
  { label: "Silver", hex: "#c8d0d8" },
] as const;

export const TOP_COLORS = [
  "#e8d4b8",
  "#f8fafc",
  "#3b82f6",
  "#06b6d4",
  "#22c55e",
  "#eab308",
  "#f97316",
  "#ec4899",
  "#6366f1",
  "#1e293b",
] as const;

export const BOTTOM_COLORS = [
  "#475569",
  "#334155",
  "#1e293b",
  "#4c1d95",
  "#831843",
  "#374151",
  "#0f172a",
  "#64748b",
] as const;

export const SHOE_COLORS = [
  "#c4a574",
  "#f8fafc",
  "#1a1a1a",
  "#5c4033",
  "#ffffff",
  "#334155",
  "#dc2626",
  "#3b82f6",
] as const;

export const HAIR_COLORS = [
  { label: "Black", hex: "#1a1a1a" },
  { label: "Brown", hex: "#5c4033" },
  { label: "Blonde", hex: "#d4a853" },
  { label: "Auburn", hex: "#8b3a2a" },
  { label: "Silver hair", hex: "#b0b8c0" },
  { label: "Pink", hex: "#f472b6" },
  { label: "Purple", hex: "#a855f7" },
  { label: "Teal", hex: "#14b8a6" },
  { label: "Neon", hex: "#22d3ee" },
  { label: "Rainbow", hex: "linear" },
] as const;

export const EYE_COLORS = [
  { label: "Green", hex: "#4a6741" },
  { label: "Brown", hex: "#6b4423" },
  { label: "Blue", hex: "#3b82c4" },
  { label: "Gray", hex: "#94a3b8" },
  { label: "Hazel", hex: "#a16207" },
  { label: "Purple", hex: "#7c3aed" },
  { label: "Pink", hex: "#ec4899" },
  { label: "Gold", hex: "#ca8a04" },
  { label: "Red", hex: "#dc2626" },
  { label: "Cyber", hex: "#22d3ee" },
] as const;

export const LIP_COLORS = [
  { label: "Rose", hex: "#e879a0" },
  { label: "Coral", hex: "#fb7185" },
  { label: "Red", hex: "#ef4444" },
  { label: "Berry", hex: "#be123c" },
  { label: "Peach", hex: "#fda4af" },
  { label: "Nude", hex: "#d4a574" },
  { label: "Plum", hex: "#9333ea" },
  { label: "Orange", hex: "#f97316" },
] as const;

export const FACE_SHAPES: { id: FaceShape; label: string }[] = (
  Object.entries(FACE_SHAPE_LABELS) as [FaceShape, string][]
).map(([id, label]) => ({ id, label }));

/** ZEPETO式 원터치 얼굴 프리셋 */
export const FACE_QUICK_PRESETS: {
  id: string;
  label: string;
  patch: Partial<Omit<AvatarFaceParams, "makeup">> & { makeup?: Partial<AvatarMakeupParams> };
}[] = [
  {
    id: "cute",
    label: "Cute",
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
    label: "Cool",
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
    label: "Mature",
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
    label: "Anime",
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
  { id: "female", label: "Feminine" },
  { id: "male", label: "Masculine" },
  { id: "neutral", label: "Androgynous" },
];

export const OUTFIT_PRESETS: { id: OutfitPreset; label: string; emoji: string }[] = [
  { id: "casual", label: "Casual", emoji: "👕" },
  { id: "dressy", label: "Dressy", emoji: "👗" },
  { id: "office", label: "Office", emoji: "💼" },
  { id: "game", label: "Game character", emoji: "🎮" },
  { id: "fantasy", label: "Fantasy", emoji: "🧙" },
  { id: "cyberpunk", label: "Cyberpunk", emoji: "🤖" },
];

export const HAIR_STYLES = [
  "Bob",
  "Long straight hair",
  "Ponytail",
  "Twin tails",
  "Short cut",
  "Wavy",
  "Braids",
  "Spiky",
] as const;

export const MOTIONS: { id: MotionId; label: string }[] = [
  { id: "idle", label: "Default" },
  { id: "wave", label: "Wave hello" },
  { id: "dance", label: "Dance" },
  { id: "talk", label: "Talk" },
  { id: "smile", label: "Laugh" },
  { id: "bow", label: "Greet" },
];

export const PARTICLE_EFFECTS = [
  { id: "none" as const, label: "None" },
  { id: "glitter" as const, label: "Glitter" },
  { id: "hearts" as const, label: "Heart" },
  { id: "stars" as const, label: "Star" },
  { id: "fireworks" as const, label: "Flame" },
];

export const BACKGROUNDS: { id: BackgroundId; label: string }[] = [
  { id: "space", label: "Space" },
  { id: "pink", label: "Pink" },
  { id: "cyber", label: "Cyber" },
  { id: "nature", label: "Natural" },
  { id: "solid", label: "Solid" },
];

export const OUTFIT_LAYER_LABELS = [
  { key: "top" as const, label: "Tops" },
  { key: "bottom" as const, label: "Bottoms" },
  { key: "shoes" as const, label: "Shoes" },
  { key: "headwear" as const, label: "Headwear" },
  { key: "accessories" as const, label: "Accessories" },
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
