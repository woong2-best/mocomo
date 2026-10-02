import type { FaceMask3dId } from "@/lib/face-filters/mask-textures";
import type { BeautyProOptions } from "@/lib/face-filters/beauty-pro";

export type FaceFilterId =
  | "none"
  | "natural"
  | "glow"
  | "smooth"
  | "vivid"
  | "warm"
  | "cool"
  | "film"
  | "blush"
  | "blushy-pro"
  | "glass-skin"
  | "soft-focus"
  | "dog"
  | "cat"
  | "bunny"
  | "crown"
  | "glasses"
  | "hearts"
  | "bubble-hearts"
  | "bubbles-star"
  | "dalmatian"
  | "glitter-dog"
  | "mochi-bear"
  | "dog-face"
  | "cat-face"
  | "bear-face"
  | "clown-face"
  | "fox-face";

export type FaceFilterCategory = "beauty" | "ar" | "mask3d";

export type ArOverlayId =
  | "dog"
  | "cat"
  | "bunny"
  | "crown"
  | "glasses"
  | "hearts"
  | "bubble-hearts"
  | "bubbles-star"
  | "dalmatian"
  | "glitter-dog"
  | "mochi-bear";

export type FaceFilterPreset = {
  id: FaceFilterId;
  label: string;
  emoji: string;
  category: FaceFilterCategory;
  /** 인스타 스타일 뷰티·색감 강도 0~1 */
  beauty: number;
  /** 전체 색감 CSS filter */
  colorFilter: string;
  /** 프리미엄 다중 패스 뷰티 */
  beautyPro?: BeautyProOptions;
  /** AR 오버레이 */
  overlay?: ArOverlayId;
  /** 얼굴 전체 밀착 3D 마스크 (메시 워핑) */
  mask3d?: FaceMask3dId;
  /** 볼 톤 (beautyPro 미사용 시) */
  blush?: number;
  /** 얼굴 글리터 강도 0~1 */
  glitter?: number;
};

export const FACE_FILTER_PRESETS: FaceFilterPreset[] = [
  { id: "none", label: "Original", emoji: "✨", category: "beauty", beauty: 0, colorFilter: "none" },
  {
    id: "blushy-pro",
    label: "Blush",
    emoji: "♡",
    category: "beauty",
    beauty: 0,
    colorFilter: "brightness(1.05) saturate(1.12) contrast(0.98)",
    beautyPro: { smooth: 0.82, glow: 0.55, blush: 0.72, eyeBright: 0.45, lipTint: 0.65, lipColor: "#E8506A" },
  },
  {
    id: "glass-skin",
    label: "Glass",
    emoji: "💎",
    category: "beauty",
    beauty: 0,
    colorFilter: "brightness(1.06) saturate(1.08) contrast(0.96)",
    beautyPro: { smooth: 0.88, glow: 0.72, eyeBright: 0.55, lipTint: 0.35, lipColor: "#D06070" },
  },
  {
    id: "soft-focus",
    label: "Soft",
    emoji: "🌸",
    category: "beauty",
    beauty: 0,
    colorFilter: "brightness(1.04) saturate(1.06) contrast(0.97)",
    beautyPro: { smooth: 0.75, glow: 0.48, blush: 0.35, eyeBright: 0.38, lipTint: 0.42, lipColor: "#C85868" },
  },
  { id: "natural", label: "Natural", emoji: "🌿", category: "beauty", beauty: 0.35, colorFilter: "brightness(1.03) contrast(1.02) saturate(1.05)" },
  { id: "glow", label: "Glow", emoji: "💫", category: "beauty", beauty: 0.55, colorFilter: "brightness(1.08) contrast(0.98) saturate(1.12)" },
  { id: "smooth", label: "Radiance", emoji: "✨", category: "beauty", beauty: 0.75, colorFilter: "brightness(1.05) saturate(1.08)" },
  { id: "vivid", label: "Vivid", emoji: "🔥", category: "beauty", beauty: 0.25, colorFilter: "contrast(1.12) saturate(1.28)" },
  { id: "warm", label: "Warm", emoji: "🌅", category: "beauty", beauty: 0.4, colorFilter: "sepia(0.12) saturate(1.15) brightness(1.04)" },
  { id: "cool", label: "Cool", emoji: "❄️", category: "beauty", beauty: 0.35, colorFilter: "hue-rotate(-8deg) saturate(1.1) brightness(1.03)" },
  { id: "film", label: "Film", emoji: "🎞️", category: "beauty", beauty: 0.3, colorFilter: "contrast(1.08) sepia(0.18) saturate(0.92)" },
  { id: "blush", label: "Blusher", emoji: "🍑", category: "beauty", beauty: 0.5, colorFilter: "brightness(1.04) saturate(1.1)", blush: 0.55 },
  {
    id: "bubble-hearts",
    label: "Bubble♡",
    emoji: "💗",
    category: "ar",
    beauty: 0,
    colorFilter: "brightness(1.06) saturate(1.15) contrast(0.98)",
    beautyPro: { smooth: 0.55, glow: 0.35, blush: 0.4, eyeBright: 0.25 },
    overlay: "bubble-hearts",
  },
  {
    id: "bubbles-star",
    label: "Bubble☆",
    emoji: "⭐",
    category: "ar",
    beauty: 0,
    colorFilter: "brightness(1.05) saturate(1.12)",
    beautyPro: { smooth: 0.5, glow: 0.4, eyeBright: 0.3 },
    overlay: "bubbles-star",
  },
  {
    id: "dalmatian",
    label: "Dalmatian",
    emoji: "🐕",
    category: "ar",
    beauty: 0,
    colorFilter: "brightness(1.04) saturate(1.08)",
    beautyPro: { smooth: 0.45, glow: 0.25 },
    overlay: "dalmatian",
  },
  {
    id: "glitter-dog",
    label: "Glitter pup",
    emoji: "🐶",
    category: "ar",
    beauty: 0,
    colorFilter: "brightness(1.05) saturate(1.1)",
    beautyPro: { smooth: 0.5, glow: 0.3 },
    overlay: "glitter-dog",
  },
  {
    id: "mochi-bear",
    label: "Mochi bear",
    emoji: "🐻",
    category: "ar",
    beauty: 0,
    colorFilter: "brightness(1.05) saturate(1.08)",
    beautyPro: { smooth: 0.48, glow: 0.28, blush: 0.35 },
    overlay: "mochi-bear",
  },
  { id: "dog", label: "Puppy", emoji: "🐶", category: "ar", beauty: 0.35, colorFilter: "brightness(1.04) saturate(1.08) sepia(0.06)", overlay: "dog" },
  { id: "cat", label: "Cat", emoji: "🐱", category: "ar", beauty: 0.3, colorFilter: "brightness(1.03) saturate(1.05) contrast(1.02)", overlay: "cat" },
  { id: "bunny", label: "Bunny", emoji: "🐰", category: "ar", beauty: 0.28, colorFilter: "brightness(1.06) saturate(0.98) contrast(0.98)", overlay: "bunny" },
  { id: "crown", label: "Crown", emoji: "👑", category: "ar", beauty: 0.25, colorFilter: "brightness(1.08) saturate(1.15) contrast(1.04)", overlay: "crown" },
  { id: "glasses", label: "Glasses", emoji: "🕶️", category: "ar", beauty: 0.2, colorFilter: "contrast(1.06) saturate(1.02)", overlay: "glasses" },
  { id: "hearts", label: "Heart", emoji: "💕", category: "ar", beauty: 0.32, colorFilter: "brightness(1.05) saturate(1.18) hue-rotate(-4deg)", overlay: "hearts" },
  { id: "dog-face", label: "Dog ears", emoji: "🐶", category: "mask3d", beauty: 0.2, colorFilter: "brightness(1.04) saturate(1.08)", mask3d: "dog-face" },
  { id: "cat-face", label: "Cat ears", emoji: "🐱", category: "mask3d", beauty: 0.2, colorFilter: "brightness(1.04) saturate(1.08)", mask3d: "cat-face" },
  { id: "bear-face", label: "Bear", emoji: "🐻", category: "mask3d", beauty: 0.2, colorFilter: "brightness(1.03) saturate(1.05)", mask3d: "bear-face" },
  { id: "clown-face", label: "Clown", emoji: "🤡", category: "mask3d", beauty: 0.15, colorFilter: "brightness(1.06) saturate(1.1)", mask3d: "clown-face" },
  { id: "fox-face", label: "Fox", emoji: "🦊", category: "mask3d", beauty: 0.2, colorFilter: "brightness(1.05) saturate(1.12)", mask3d: "fox-face" },
];

export const FACE_FILTER_BY_CATEGORY: Record<FaceFilterCategory, FaceFilterPreset[]> = {
  beauty: FACE_FILTER_PRESETS.filter((p) => p.category === "beauty"),
  ar: FACE_FILTER_PRESETS.filter((p) => p.category === "ar"),
  mask3d: FACE_FILTER_PRESETS.filter((p) => p.category === "mask3d"),
};

export function getFaceFilterPreset(id: FaceFilterId): FaceFilterPreset {
  return FACE_FILTER_PRESETS.find((p) => p.id === id) ?? FACE_FILTER_PRESETS[0];
}

/** MediaPipe 얼굴 랜드마크가 필요한 필터인지 */
export function filterNeedsFaceLandmarks(id: FaceFilterId): boolean {
  if (id === "none") return false;
  const p = getFaceFilterPreset(id);
  return Boolean(p.overlay || p.mask3d || p.beautyPro || p.beauty > 0 || p.blush || p.glitter);
}

/** MediaPipe Face Landmarker — 얼굴 윤곽 */
export const FACE_OVAL_INDICES = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152,
  148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
] as const;

export const LEFT_EYE_INDICES = [33, 133, 160, 159, 158, 157, 173, 155, 154, 153, 145, 144, 163, 7] as const;
export const RIGHT_EYE_INDICES = [362, 263, 387, 386, 385, 384, 398, 382, 381, 380, 374, 373, 390, 249] as const;
