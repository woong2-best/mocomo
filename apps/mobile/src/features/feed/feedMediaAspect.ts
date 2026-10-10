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

export function feedMediaMaxHeight(windowHeight: number): number {
  return Math.round(Math.min(windowHeight * 0.56, 510));
}

/** Taller than wide — same rule as the web profile / feed frame. */
export function isPortraitMedia(width?: number | null, height?: number | null): boolean {
  return !!width && !!height && width > 0 && height > width;
}

export type FeedMediaFrame = {
  width: number;
  height: number;
  /** Portrait single tiles show the whole picture; landscape stays cropped to the column. */
  contain: boolean;
};

/**
 * One photo or video: portrait sits on the left at its own ratio (whole frame visible).
 * Landscape stays the full column width. Several photos use `feedCarouselTileSize`.
 */
export function feedMediaFrame(
  layoutWidth: number,
  windowHeight: number,
  width?: number | null,
  height?: number | null,
  type?: string
): FeedMediaFrame {
  const maxH = feedMediaMaxHeight(windowHeight);
  if (isPortraitMedia(width, height) && width && height) {
    const aspect = width / height;
    const frameHeight = Math.max(120, Math.min(maxH, layoutWidth / aspect));
    const frameWidth = Math.min(layoutWidth, frameHeight * aspect);
    return {
      width: Math.round(frameWidth),
      height: Math.round(frameHeight),
      contain: true,
    };
  }
  const aspect = clampFeedMediaAspect(width, height, type);
  return {
    width: layoutWidth,
    height: Math.round(Math.max(120, Math.min(layoutWidth / aspect, maxH))),
    contain: false,
  };
}

/** True width/height. Missing size falls back like a single tile. */
export function feedMediaNativeAspect(
  width?: number | null,
  height?: number | null,
  type?: string
): number {
  if (width && height && width > 0 && height > 0) return width / height;
  return type === "VIDEO" ? 16 / 9 : 16 / 10;
}

/**
 * Mixed carousel: every tile shares the max height, and width follows 16:9 or portrait.
 * Neighbors sit in the same row instead of each taking ~88% at its own height.
 */
export function feedCarouselTileSize(
  windowHeight: number,
  width?: number | null,
  height?: number | null,
  type?: string
): { width: number; height: number } {
  const frameHeight = feedMediaMaxHeight(windowHeight);
  const aspect = feedMediaNativeAspect(width, height, type);
  return {
    height: frameHeight,
    width: Math.max(72, Math.round(frameHeight * aspect)),
  };
}

/** Full-column cell height. Portrait is cropped to 3:4. */
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
