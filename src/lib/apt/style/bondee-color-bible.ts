/**
 * Bondee Color Bible — RC-A A-2
 * 허용 팔레트 6~8색 + 금지색
 */

export const BONDEE_COLORS = {
  cream: "#FAF6F0",
  warmBeige: "#E8C9A0",
  lightOak: "#D4BC98",
  pastelGreen: "#9BB89A",
  mutedBlue: "#A8C4D4",
  softPink: "#E8D4D0",
  warmWood: "#C9956A",
  charcoalEdge: "#4A4038",
  /** 조명 반응 */
  sunWarm: "#FFF4E6",
  ambientCream: "#FFF4E7",
  floorBounce: "#FFE8D2",
  rimOrange: "#FFD7B0",
  fogCream: "#FFF7EF",
  shadowSoft: "#3D3228",
} as const;

/** 순검정·순흰색·고채도 금지 */
export const BONDEE_FORBIDDEN = ["#000000", "#ffffff", "#ff0000", "#0000ff"] as const;

export function hexToThree(hex: string): number {
  return parseInt(hex.replace("#", ""), 16);
}

export const BONDEE_CSS_LUT = {
  /** Contrast -5%, Saturation -8%, Temperature +4%, Lift +2% */
  filter: "contrast(0.95) saturate(0.92) brightness(1.02) sepia(0.04)",
} as const;

export const BONDEE_STICKER_SHADOW =
  "drop-shadow(0 3px 2px rgba(61,50,40,0.18)) drop-shadow(0 10px 18px rgba(61,50,40,0.14))";

export const BONDEE_CONTACT_AO = {
  opacity: 0.18,
  radius: 0.35,
} as const;
