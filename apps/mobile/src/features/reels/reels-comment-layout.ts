/** Instagram Reels comments: one progress drives video scale and the sheet. */

export const REELS_COMMENT_DURATION_MS = 320;
/** Gap so the scaled video's rounded corners sit above the sheet. */
export const REELS_COMMENT_VIDEO_GAP = 10;
/** Visual corner radius on the shrunk video (px after scale). */
export const REELS_COMMENT_VIDEO_RADIUS = 14;

export function reelsCommentSheetHeight(screenHeight: number, bottomInset: number): number {
  const h = Math.max(1, screenHeight);
  const raw = h * 0.58;
  const min = h * 0.5;
  const max = h * 0.64;
  const inset = Math.min(Math.max(0, bottomInset), 28);
  return Math.round(Math.min(max, Math.max(min, raw)) + inset);
}

/**
 * How much of the IME still covers a bottom-anchored sheet.
 * Android edge-to-edge often shrinks window metrics without moving this layer,
 * so pass the layer's onLayout height — not `useWindowDimensions`.
 * `restingHeight` is that layout height while the keyboard is closed.
 */
export function reelsCommentKeyboardCover(
  keyboardOverlap: number,
  layoutHeight: number,
  restingHeight: number
): number {
  const overlap = Math.max(0, keyboardOverlap);
  if (overlap === 0 || layoutHeight <= 0) return 0;
  const resting = Math.max(layoutHeight, restingHeight);
  const absorbed = Math.max(0, resting - layoutHeight);
  return Math.max(0, overlap - absorbed);
}

/**
 * Place the sheet just above the IME. `keyboardCover` is the overlap that
 * still paints over the bottom of this layer (0 when the layer already shrank).
 */
export function reelsCommentKeyboardFrame(
  sheetHeight: number,
  restingHeight: number,
  layoutHeight: number,
  keyboardCover: number,
  topGap = 36
): { height: number; lift: number } {
  const sheet = Math.max(0, sheetHeight);
  if (layoutHeight <= 0 || restingHeight <= 0) {
    return { height: Math.round(sheet), lift: 0 };
  }
  const resting = Math.max(1, restingHeight);
  const layout = Math.max(1, layoutHeight);
  const cover = Math.max(0, keyboardCover);
  if (cover <= 0) {
    return { height: Math.round(Math.min(sheet, layout)), lift: 0 };
  }
  const maxLift = Math.max(0, resting - 160 - topGap);
  const lift = Math.min(cover, maxLift);
  const available = Math.max(160, resting - lift - topGap);
  const height = Math.min(sheet, available, layout);
  return { height: Math.round(height), lift: Math.round(lift) };
}

export function reelsCommentVideoTransform(screenHeight: number, sheetHeight: number) {
  "worklet";
  const h = Math.max(1, screenHeight);
  const sheet = Math.min(Math.max(0, sheetHeight), h - 80);
  const gap = Math.min(REELS_COMMENT_VIDEO_GAP, Math.max(0, h - sheet - 80));
  const scale = (h - sheet - gap) / h;
  /** Center-origin scale: shift up so the scaled frame sits in the leftover top slot. */
  const translateY = -(sheet + gap) / 2;
  return { scale, translateY };
}

export function reelsCommentVideoAtProgress(
  progress: number,
  screenHeight: number,
  sheetHeight: number
) {
  "worklet";
  const t = Math.min(1, Math.max(0, progress));
  const { scale, translateY } = reelsCommentVideoTransform(screenHeight, sheetHeight);
  const liveScale = 1 + (scale - 1) * t;
  const visualRadius = REELS_COMMENT_VIDEO_RADIUS * t;
  return {
    scale: liveScale,
    translateY: translateY * t,
    /** Local radius so the post-scale corner reads as `visualRadius`. */
    borderRadius: visualRadius / Math.max(0.05, liveScale),
  };
}

export function reelsCommentSheetTranslateY(progress: number, sheetHeight: number) {
  "worklet";
  const t = Math.min(1, Math.max(0, progress));
  return sheetHeight * (1 - t);
}

export function reelsCommentShouldClose(progress: number, velocityY: number): boolean {
  "worklet";
  return velocityY > 1100 || progress < 0.55;
}
