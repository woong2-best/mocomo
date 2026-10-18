/** Instagram Reels comments: one progress drives video scale and the sheet. */

export const REELS_COMMENT_DURATION_MS = 320;

export function reelsCommentSheetHeight(screenHeight: number, bottomInset: number): number {
  const h = Math.max(1, screenHeight);
  const raw = h * 0.58;
  const min = h * 0.5;
  const max = h * 0.64;
  const inset = Math.min(Math.max(0, bottomInset), 28);
  return Math.round(Math.min(max, Math.max(min, raw)) + inset);
}

export function reelsCommentVideoTransform(screenHeight: number, sheetHeight: number) {
  "worklet";
  const h = Math.max(1, screenHeight);
  const sheet = Math.min(Math.max(0, sheetHeight), h - 80);
  const scale = (h - sheet) / h;
  /** Center-origin scale: shift up so the scaled frame sits in the leftover top slot. */
  const translateY = -sheet / 2;
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
  return {
    scale: 1 + (scale - 1) * t,
    translateY: translateY * t,
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
