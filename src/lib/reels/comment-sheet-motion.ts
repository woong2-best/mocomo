/** Instagram Reels comments: one progress value drives the video and the sheet. */

export const REELS_COMMENT_DURATION_MS = 320;
export const REELS_COMMENT_EASE = "cubic-bezier(0.33, 1, 0.68, 1)";
/** Gap so the scaled video's rounded corners sit above the sheet. */
export const REELS_COMMENT_VIDEO_GAP = 10;
/** Visual corner radius on the shrunk video (px after scale). */
export const REELS_COMMENT_VIDEO_RADIUS = 14;

export function reelsCommentSheetHeight(screenHeight: number, bottomInset = 0): number {
  const h = Math.max(1, screenHeight);
  const raw = h * 0.58;
  const min = h * 0.5;
  const max = h * 0.64;
  const inset = Math.min(Math.max(0, bottomInset), 28);
  return Math.round(Math.min(max, Math.max(min, raw)) + inset);
}

export function reelsCommentVideoTransform(screenHeight: number, sheetHeight: number) {
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
  const t = Math.min(1, Math.max(0, progress));
  return sheetHeight * (1 - t);
}

export function reelsCommentBackdropHeight(
  screenHeight: number,
  sheetHeight: number,
  progress: number
) {
  const screen = Math.max(0, screenHeight);
  const sheet = Math.max(0, sheetHeight);
  const t = Math.min(1, Math.max(0, progress));
  return Math.max(0, screen - sheet * t);
}

export function reelsCommentShouldClose(progress: number, velocityY: number): boolean {
  return velocityY > 1100 || progress < 0.55;
}

export function isCompactReelsViewport() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches;
}
