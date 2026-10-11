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
 * One photo or video: keep the real ratio, fit inside the column × max height.
 * Pixels are never stretched — the frame matches the media, then cover fills it.
 */
export function feedMediaFrame(
  layoutWidth: number,
  windowHeight: number,
  width?: number | null,
  height?: number | null,
  type?: string
): FeedMediaFrame {
  const maxH = feedMediaMaxHeight(windowHeight);
  const hasSize = !!(width && height && width > 0 && height > 0);
  const aspect = feedMediaNativeAspect(width, height, type);
  let frameWidth = layoutWidth;
  let frameHeight = frameWidth / aspect;
  if (frameHeight > maxH) {
    frameHeight = maxH;
    frameWidth = Math.min(layoutWidth, frameHeight * aspect);
  }
  const minH = hasSize ? 1 : 120;
  return {
    width: Math.round(Math.max(72, frameWidth)),
    height: Math.round(Math.max(minH, frameHeight)),
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

/** Full-column cell height from the same single-tile frame. */
export function feedMediaFrameHeight(
  layoutWidth: number,
  windowHeight: number,
  width?: number | null,
  height?: number | null,
  type?: string
): number {
  return feedMediaFrame(layoutWidth, windowHeight, width, height, type).height;
}

export const FEED_MEDIA_GRID_GAP = 2;

export type FeedMediaGridCell = {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Twitter-style attach grid (equal 50/50 split, 3 = left + two, 4 = 2×2).
 * Extra items stay in the 4th cell with a +N overlay.
 */
export function feedMediaGridLayout(
  layoutWidth: number,
  windowHeight: number,
  count: number
): { width: number; height: number; cells: FeedMediaGridCell[]; overflow: number } {
  const n = Math.min(Math.max(count, 2), 4);
  const overflow = Math.max(0, count - 4);
  const gap = FEED_MEDIA_GRID_GAP;
  const maxH = feedMediaMaxHeight(windowHeight);
  const width = Math.max(1, Math.round(layoutWidth));

  let height: number;
  if (n === 2) {
    height = Math.min(maxH, Math.round(width * (9 / 16)));
  } else if (n === 3) {
    height = Math.min(maxH, Math.round(width * 0.75));
  } else {
    height = Math.min(maxH, width);
  }
  height = Math.max(120, height);

  const halfW = Math.floor((width - gap) / 2);
  const rightW = width - gap - halfW;
  const halfH = Math.floor((height - gap) / 2);
  const bottomH = height - gap - halfH;

  const cells: FeedMediaGridCell[] = [];
  if (n === 2) {
    cells.push({ index: 0, x: 0, y: 0, width: halfW, height });
    cells.push({ index: 1, x: halfW + gap, y: 0, width: rightW, height });
  } else if (n === 3) {
    cells.push({ index: 0, x: 0, y: 0, width: halfW, height });
    cells.push({ index: 1, x: halfW + gap, y: 0, width: rightW, height: halfH });
    cells.push({ index: 2, x: halfW + gap, y: halfH + gap, width: rightW, height: bottomH });
  } else {
    cells.push({ index: 0, x: 0, y: 0, width: halfW, height: halfH });
    cells.push({ index: 1, x: halfW + gap, y: 0, width: rightW, height: halfH });
    cells.push({ index: 2, x: 0, y: halfH + gap, width: halfW, height: bottomH });
    cells.push({ index: 3, x: halfW + gap, y: halfH + gap, width: rightW, height: bottomH });
  }

  return { width, height, cells, overflow };
}
