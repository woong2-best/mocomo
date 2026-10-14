/** Transient Instagram-style zoom: two-finger only, fill the phone, snap back. */

export const REEL_PINCH_MAX = 4;
export const REEL_PINCH_MIN = 0.92;
export const REEL_PINCH_SNAP_MS = 240;
/** Ignore jitter until the gesture is clearly a two-finger pinch. */
export const REEL_PINCH_COMMIT = 1.12;
/**
 * One-finger travel past this belongs to the pagers (sideways = next media,
 * up/down = next post). Tap and 2× only win while the finger stays inside it.
 */
export const REEL_GESTURE_SLOP = 16;
/** A still finger held this long is 2×. A shorter release is play/pause. */
export const REEL_HOLD_MS = 280;

export function reelOneFingerShouldYield(distanceSq: number): boolean {
  "worklet";
  return distanceSq > REEL_GESTURE_SLOP * REEL_GESTURE_SLOP;
}

export type ReelSurfaceIntent = "pinch" | "swipe" | "fast" | "tap" | "pending";

/**
 * Instagram Reels priority on one surface:
 * two fingers zoom, movement pages, a still hold is 2×, a short tap pauses.
 */
export function reelSurfaceIntent(input: {
  pointers: number;
  distance: number;
  heldMs: number;
  released: boolean;
}): ReelSurfaceIntent {
  if (input.pointers >= 2) return "pinch";
  if (input.distance > REEL_GESTURE_SLOP) return "swipe";
  if (!input.released && input.heldMs < REEL_HOLD_MS) return "pending";
  if (input.heldMs >= REEL_HOLD_MS) return "fast";
  return "tap";
}

export function clampReelPinchScale(scale: number): number {
  "worklet";
  return Math.min(REEL_PINCH_MAX, Math.max(REEL_PINCH_MIN, scale));
}

export function reelPinchShouldCommit(scale: number, pointers: number): boolean {
  "worklet";
  return pointers >= 2 && scale >= REEL_PINCH_COMMIT;
}

export function containFittedSize(
  mediaW: number,
  mediaH: number,
  viewW: number,
  viewH: number
): { w: number; h: number } {
  if (mediaW <= 0 || mediaH <= 0 || viewW <= 0 || viewH <= 0) {
    return { w: viewW, h: viewH };
  }
  const scale = Math.min(viewW / mediaW, viewH / mediaH);
  return { w: mediaW * scale, h: mediaH * scale };
}

/**
 * Scale a contain-fitted stage so the media covers the full phone.
 * Landscape / square clips no longer stay letterboxed in a 9:16 box.
 */
export function reelFillPhoneScale(
  mediaW: number,
  mediaH: number,
  stageW: number,
  stageH: number,
  phoneW: number,
  phoneH: number
): number {
  const fitted = containFittedSize(mediaW, mediaH, stageW, stageH);
  if (fitted.w <= 0 || fitted.h <= 0 || phoneW <= 0 || phoneH <= 0) return 1;
  return Math.max(phoneW / fitted.w, phoneH / fitted.h, 1);
}

/** After commit, map pinch scale so 1.12× already fills the phone, then zoom further. */
export function reelCommittedVisualScale(pinchScale: number, fillBoost: number): number {
  "worklet";
  const boost = Math.max(1, fillBoost);
  const extra = clampReelPinchScale(pinchScale) / REEL_PINCH_COMMIT;
  return Math.min(REEL_PINCH_MAX * boost, boost * extra);
}

/** Keep the pinch midpoint under the fingers while scaling from the view center. */
export function reelPinchOffset(
  scale: number,
  originX: number,
  originY: number,
  focalX: number,
  focalY: number,
  centerX: number,
  centerY: number
): { x: number; y: number } {
  "worklet";
  return {
    x: (1 - scale) * (originX - centerX) + (focalX - originX),
    y: (1 - scale) * (originY - centerY) + (focalY - originY),
  };
}
