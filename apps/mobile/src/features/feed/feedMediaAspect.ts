/** Twitter-style timeline crop: never taller than 3:4, never wider than 1.91:1. */
export const FEED_MEDIA_MIN_ASPECT = 3 / 4;
export const FEED_MEDIA_MAX_ASPECT = 1.91;

export function clampFeedMediaAspect(
  width?: number | null,
  height?: number | null,
  type?: string
): number {
  if (width && height && width > 0 && height > 0) {
    return Math.min(Math.max(width / height, FEED_MEDIA_MIN_ASPECT), FEED_MEDIA_MAX_ASPECT);
  }
  return type === "VIDEO" ? 16 / 9 : 16 / 10;
}

/** Portrait 9:16 is cropped; landscape keeps its natural (clamped) height. */
export function feedMediaFrameHeight(
  layoutWidth: number,
  windowHeight: number,
  width?: number | null,
  height?: number | null,
  type?: string
): number {
  const aspect = clampFeedMediaAspect(width, height, type);
  const maxH = Math.round(Math.min(windowHeight * 0.58, 520));
  return Math.max(120, Math.min(layoutWidth / aspect, maxH));
}
