/** Viewport ratio required for autoplay (X/IG-style). */
export const AUTOPLAY_THRESHOLD = 0.6;

/** Short videos loop; longer ones hold the last frame. */
export const SHORT_VIDEO_LOOP_MAX_SEC = 60;

/** PC hover preview delay. */
export const HOVER_PREVIEW_DELAY_MS = 500;

/** Seek step for ←/→ keys. */
export const SEEK_STEP_SEC = 5;

/** Volume step for ↑/↓ keys. */
export const VOLUME_STEP = 0.05;

/** Long-press playback rate on mobile. */
export const LONG_PRESS_RATE = 2;
export const LONG_PRESS_MS = 400;

/** Double-tap window for like. */
export const DOUBLE_TAP_MS = 300;

/** Unload buffer when fully off-screen this long. */
export const UNLOAD_AFTER_MS = 8_000;

/** Prefetch next N videos by scroll direction. */
export const PREFETCH_AHEAD = 2;

export const MUTE_STORAGE_KEY = "mocomo_video_muted";
export const VOLUME_STORAGE_KEY = "mocomo_video_volume";
export const PROGRESS_STORAGE_KEY = "mocomo_video_progress";

export const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 16000] as const;
export const MAX_RETRIES = 5;

export const DEFAULT_VOLUME = 1;
