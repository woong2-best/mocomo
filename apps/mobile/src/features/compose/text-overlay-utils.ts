/** Instagram Stories–style text overlay helpers (preview + export parity). */

export const TEXT_OVERLAY_COLORS = [
  "#FFFFFF",
  "#000000",
  "#FF3B30",
  "#FF9500",
  "#FFCC00",
  "#34C759",
  "#007AFF",
  "#5856D6",
  "#AF52DE",
  "#FF2D55",
] as const;

export const DEFAULT_TEXT_OVERLAY_COLOR = "#FFFFFF";

/** Font size as a fraction of the rendered image height — same ratio in preview and export. */
export const TEXT_SIZE_HEIGHT_RATIO = 0.048;

export type ContainRect = { x: number; y: number; w: number; h: number };

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function normalizeTextOverlayColor(color?: string): string {
  if (!color) return DEFAULT_TEXT_OVERLAY_COLOR;
  return TEXT_OVERLAY_COLORS.includes(color as (typeof TEXT_OVERLAY_COLORS)[number])
    ? color
    : color.startsWith("#")
      ? color
      : DEFAULT_TEXT_OVERLAY_COLOR;
}

export function computeContainRect(
  containerW: number,
  containerH: number,
  imageW: number,
  imageH: number
): ContainRect {
  if (containerW <= 0 || containerH <= 0 || imageW <= 0 || imageH <= 0) {
    return { x: 0, y: 0, w: Math.max(containerW, 1), h: Math.max(containerH, 1) };
  }
  const scale = Math.min(containerW / imageW, containerH / imageH);
  const w = imageW * scale;
  const h = imageH * scale;
  return { x: (containerW - w) / 2, y: (containerH - h) / 2, w, h };
}

export function textOverlayFontSize(imageHeight: number, scale = 1): number {
  return Math.round(Math.max(14, imageHeight * TEXT_SIZE_HEIGHT_RATIO * scale));
}

function isLightHex(hex: string): boolean {
  const h = hex.replace("#", "");
  if (h.length < 6) return true;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

export function getTextOverlayTextStyle(color: string | undefined, fontSize: number) {
  const fill = normalizeTextOverlayColor(color);
  const light = isLightHex(fill);
  return {
    fontSize,
    fontWeight: "800" as const,
    color: fill,
    textShadowColor: light ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  };
}

const SNAP_THRESHOLD = 0.025;

/** Snap to center / edges like Instagram when close. */
export function snapOverlayPosition(x: number, y: number): { x: number; y: number } {
  const guides = [0, 0.5, 1];
  let nx = x;
  let ny = y;
  for (const g of guides) {
    if (Math.abs(nx - g) < SNAP_THRESHOLD) nx = g;
    if (Math.abs(ny - g) < SNAP_THRESHOLD) ny = g;
  }
  return { x: nx, y: ny };
}

export function overlayPixelPosition(
  overlay: { x: number; y: number },
  imageW: number,
  imageH: number
) {
  return {
    left: overlay.x * imageW,
    top: overlay.y * imageH,
  };
}
