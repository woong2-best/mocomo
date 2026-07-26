/** Viewport ratio to start autoplay (spec: ~70%). */
export const REELS_AUTOPLAY_THRESHOLD = 0.7;

/** Pause below this (hysteresis). */
export const REELS_AUTOPAUSE_THRESHOLD = 0.35;

/** Keep mounted players: prev N + current + next N. */
export const REELS_CACHE_BEHIND = 3;
export const REELS_CACHE_AHEAD = 3;

/** Prefetch metadata/bytes for neighbors. */
export const REELS_PRELOAD_AHEAD = 2;

/** Page size for /api/reels. */
export const REELS_PAGE_SIZE = 12;

/** Prefetch next page when this many items remain. */
export const REELS_PREFETCH_REMAINING = 4;

/** Local dismiss list for “not interested”. */
export const REELS_DISMISSED_KEY = "mocomo_reels_dismissed";
export const REELS_DISMISSED_MAX = 200;

/** Short loop cutoff (seconds). */
export const REELS_LOOP_MAX_SEC = 90;
