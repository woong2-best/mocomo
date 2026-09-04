export {
  AUTOPLAY_THRESHOLD,
  AUTOPAUSE_THRESHOLD,
  SHORT_VIDEO_LOOP_MAX_SEC,
  HOVER_PREVIEW_DELAY_MS,
  SEEK_STEP_SEC,
  VOLUME_STEP,
  LONG_PRESS_RATE,
  LONG_PRESS_MS,
  DOUBLE_TAP_MS,
  UNLOAD_AFTER_MS,
  PREFETCH_AHEAD,
  RETRY_DELAYS_MS,
  MAX_RETRIES,
  DEFAULT_VOLUME,
} from "@/lib/video-playback/constants";

export {
  readMutedPreference,
  writeMutedPreference,
  readVolumePreference,
  writeVolumePreference,
} from "@/lib/video-playback/prefs";

export {
  progressKey,
  getSavedProgress,
  saveProgress,
  clearProgress,
} from "@/lib/video-playback/progress-store";

export {
  getNetworkQuality,
  suggestedPreload,
  shouldAutoplayOnNetwork,
  type NetworkQuality,
} from "@/lib/video-playback/network";

export {
  getVideoPlaybackController,
  type RegisteredPlayer,
} from "@/lib/video-playback/controller";

export {
  isVideoFullscreen,
  enterVideoFullscreen,
  exitVideoFullscreen,
  toggleVideoFullscreen,
  bindVideoFullscreenEvents,
} from "@/lib/video-playback/fullscreen";

export { withVideoCacheBust } from "@/lib/video-playback/src-url";
