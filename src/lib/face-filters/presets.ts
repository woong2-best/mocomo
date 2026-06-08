import type { FaceMask3dId } from "@/lib/face-filters/mask-textures";

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
  | "dog"
  | "cat"
  | "bunny"
  | "crown"
  | "glasses"
  | "hearts"
  | "dog-face"
  | "cat-face"
  | "bear-face"
  | "clown-face"
  | "fox-face";

export type FaceFilterCategory = "beauty" | "ar" | "mask3d";

export type FaceFilterPreset = {
  id: FaceFilterId;
  label: string;
  emoji: string;
  category: FaceFilterCategory;
  /** 인스타 스타일 뷰티·색감 강도 0~1 */
  beauty: number;
  /** 전체 색감 CSS filter */
  colorFilter: string;
  /** AR 오버레이 */
  overlay?: "dog" | "cat" | "bunny" | "crown" | "glasses" | "hearts";
  /** 얼굴 전체 밀착 3D 마스크 (메시 워핑) */
  mask3d?: FaceMask3dId;
  /** 볼 톤 */
  blush?: number;
};

export const FACE_FILTER_PRESETS: FaceFilterPreset[] = [
  { id: "none", label: "원본", emoji: "✨", category: "beauty", beauty: 0, colorFilter: "none" },
  { id: "natural", label: "내추럴", emoji: "🌸", category: "beauty", beauty: 0.35, colorFilter: "brightness(1.03) contrast(1.02) saturate(1.05)" },
  { id: "glow", label: "글로우", emoji: "💫", category: "beauty", beauty: 0.55, colorFilter: "brightness(1.08) contrast(0.98) saturate(1.12)" },
  { id: "smooth", label: "광채", emoji: "💎", category: "beauty", beauty: 0.75, colorFilter: "brightness(1.05) saturate(1.08)" },
  { id: "vivid", label: "선명", emoji: "🔥", category: "beauty", beauty: 0.25, colorFilter: "contrast(1.12) saturate(1.28)" },
  { id: "warm", label: "웜톤", emoji: "🌅", category: "beauty", beauty: 0.4, colorFilter: "sepia(0.12) saturate(1.15) brightness(1.04)" },
  { id: "cool", label: "쿨톤", emoji: "❄️", category: "beauty", beauty: 0.35, colorFilter: "hue-rotate(-8deg) saturate(1.1) brightness(1.03)" },
  { id: "film", label: "필름", emoji: "🎞️", category: "beauty", beauty: 0.3, colorFilter: "contrast(1.08) sepia(0.18) saturate(0.92)" },
  { id: "blush", label: "블러셔", emoji: "🍑", category: "beauty", beauty: 0.5, colorFilter: "brightness(1.04) saturate(1.1)", blush: 0.55 },
  { id: "dog", label: "강아지", emoji: "🐶", category: "ar", beauty: 0.45, colorFilter: "brightness(1.05) saturate(1.1)", overlay: "dog" },
  { id: "cat", label: "고양이", emoji: "🐱", category: "ar", beauty: 0.45, colorFilter: "brightness(1.05) saturate(1.1)", overlay: "cat" },
  { id: "bunny", label: "토끼", emoji: "🐰", category: "ar", beauty: 0.45, colorFilter: "brightness(1.06) saturate(1.08)", overlay: "bunny" },
  { id: "crown", label: "왕관", emoji: "👑", category: "ar", beauty: 0.4, colorFilter: "brightness(1.06) saturate(1.12)", overlay: "crown" },
  { id: "glasses", label: "안경", emoji: "🕶️", category: "ar", beauty: 0.3, colorFilter: "contrast(1.05)", overlay: "glasses" },
  { id: "hearts", label: "하트", emoji: "💕", category: "ar", beauty: 0.45, colorFilter: "brightness(1.05) saturate(1.15)", overlay: "hearts" },
  { id: "dog-face", label: "강아지풀", emoji: "🐶", category: "mask3d", beauty: 0.2, colorFilter: "brightness(1.04) saturate(1.08)", mask3d: "dog-face" },
  { id: "cat-face", label: "고양이풀", emoji: "🐱", category: "mask3d", beauty: 0.2, colorFilter: "brightness(1.04) saturate(1.08)", mask3d: "cat-face" },
  { id: "bear-face", label: "곰", emoji: "🐻", category: "mask3d", beauty: 0.2, colorFilter: "brightness(1.03) saturate(1.05)", mask3d: "bear-face" },
  { id: "clown-face", label: "광대", emoji: "🤡", category: "mask3d", beauty: 0.15, colorFilter: "brightness(1.06) saturate(1.1)", mask3d: "clown-face" },
  { id: "fox-face", label: "여우", emoji: "🦊", category: "mask3d", beauty: 0.2, colorFilter: "brightness(1.05) saturate(1.12)", mask3d: "fox-face" },
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
  return Boolean(p.overlay || p.mask3d || p.beauty > 0 || p.blush);
}

/** MediaPipe Face Landmarker — 얼굴 윤곽 */
export const FACE_OVAL_INDICES = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152,
  148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
] as const;

export const LEFT_EYE_INDICES = [33, 133, 160, 159, 158, 157, 173, 155, 154, 153, 145, 144, 163, 7] as const;
export const RIGHT_EYE_INDICES = [362, 263, 387, 386, 385, 384, 398, 382, 381, 380, 374, 373, 390, 249] as const;
