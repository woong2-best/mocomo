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
  | "hearts";

export type FaceFilterPreset = {
  id: FaceFilterId;
  label: string;
  emoji: string;
  /** 인스타 스타일 뷰티·색감 강도 0~1 */
  beauty: number;
  /** 전체 색감 CSS filter */
  colorFilter: string;
  /** AR 오버레이 */
  overlay?: "dog" | "cat" | "bunny" | "crown" | "glasses" | "hearts";
  /** 볼 톤 */
  blush?: number;
};

export const FACE_FILTER_PRESETS: FaceFilterPreset[] = [
  { id: "none", label: "원본", emoji: "✨", beauty: 0, colorFilter: "none" },
  { id: "natural", label: "내추럴", emoji: "🌸", beauty: 0.35, colorFilter: "brightness(1.03) contrast(1.02) saturate(1.05)" },
  { id: "glow", label: "글로우", emoji: "💫", beauty: 0.55, colorFilter: "brightness(1.08) contrast(0.98) saturate(1.12)" },
  { id: "smooth", label: "광채", emoji: "💎", beauty: 0.75, colorFilter: "brightness(1.05) saturate(1.08)" },
  { id: "vivid", label: "선명", emoji: "🔥", beauty: 0.25, colorFilter: "contrast(1.12) saturate(1.28)" },
  { id: "warm", label: "웜톤", emoji: "🌅", beauty: 0.4, colorFilter: "sepia(0.12) saturate(1.15) brightness(1.04)" },
  { id: "cool", label: "쿨톤", emoji: "❄️", beauty: 0.35, colorFilter: "hue-rotate(-8deg) saturate(1.1) brightness(1.03)" },
  { id: "film", label: "필름", emoji: "🎞️", beauty: 0.3, colorFilter: "contrast(1.08) sepia(0.18) saturate(0.92)" },
  { id: "blush", label: "블러셔", emoji: "🍑", beauty: 0.5, colorFilter: "brightness(1.04) saturate(1.1)", blush: 0.55 },
  { id: "dog", label: "강아지", emoji: "🐶", beauty: 0.45, colorFilter: "brightness(1.05) saturate(1.1)", overlay: "dog" },
  { id: "cat", label: "고양이", emoji: "🐱", beauty: 0.45, colorFilter: "brightness(1.05) saturate(1.1)", overlay: "cat" },
  { id: "bunny", label: "토끼", emoji: "🐰", beauty: 0.45, colorFilter: "brightness(1.06) saturate(1.08)", overlay: "bunny" },
  { id: "crown", label: "왕관", emoji: "👑", beauty: 0.4, colorFilter: "brightness(1.06) saturate(1.12)", overlay: "crown" },
  { id: "glasses", label: "안경", emoji: "🕶️", beauty: 0.3, colorFilter: "contrast(1.05)", overlay: "glasses" },
  { id: "hearts", label: "하트", emoji: "💕", beauty: 0.45, colorFilter: "brightness(1.05) saturate(1.15)", overlay: "hearts" },
];

export function getFaceFilterPreset(id: FaceFilterId): FaceFilterPreset {
  return FACE_FILTER_PRESETS.find((p) => p.id === id) ?? FACE_FILTER_PRESETS[0];
}

/** MediaPipe Face Landmarker — 얼굴 윤곽 */
export const FACE_OVAL_INDICES = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152,
  148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
] as const;

export const LEFT_EYE_INDICES = [33, 133, 160, 159, 158, 157, 173, 155, 154, 153, 145, 144, 163, 7] as const;
export const RIGHT_EYE_INDICES = [362, 263, 387, 386, 385, 384, 398, 382, 381, 380, 374, 373, 390, 249] as const;
