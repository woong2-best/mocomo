/** Pixel slop before we treat a vertical offset as “between pages”. */
export const REELS_PAGE_ALIGN_EPSILON = 1.5;

/** Below this |velocity| the fling is over — snap now, don’t wait for momentum. */
export const REELS_SETTLE_VELOCITY = 0.15;

export function clampPageIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return Math.max(0, Math.min(count - 1, index));
}

export function pageIndexFromOffset(offset: number, pageSize: number, count: number): number {
  if (pageSize <= 0) return 0;
  return clampPageIndex(Math.round(offset / pageSize), count);
}

export function pageOffsetForIndex(index: number, pageSize: number): number {
  return Math.max(0, index) * Math.max(pageSize, 0);
}

export function pageOffsetDrift(offset: number, pageSize: number, count: number): number {
  if (pageSize <= 0) return 0;
  const aligned = pageOffsetForIndex(pageIndexFromOffset(offset, pageSize, count), pageSize);
  return Math.abs(offset - aligned);
}

export function isPageAligned(
  offset: number,
  pageSize: number,
  count: number,
  epsilon = REELS_PAGE_ALIGN_EPSILON
): boolean {
  return pageOffsetDrift(offset, pageSize, count) <= epsilon;
}

/** True when a fling is still running — wait for momentum end instead of snapping now. */
export function shouldWaitForMomentum(velocityY: number | undefined): boolean {
  return Math.abs(velocityY ?? 0) > REELS_SETTLE_VELOCITY;
}
