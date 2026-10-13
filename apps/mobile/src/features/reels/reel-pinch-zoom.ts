/** Transient Instagram-style zoom: pinch around a focal point, then snap back. */

export const REEL_PINCH_MAX = 4;
export const REEL_PINCH_MIN = 0.88;
export const REEL_PINCH_SNAP_MS = 240;

export function clampReelPinchScale(scale: number): number {
  "worklet";
  return Math.min(REEL_PINCH_MAX, Math.max(REEL_PINCH_MIN, scale));
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
