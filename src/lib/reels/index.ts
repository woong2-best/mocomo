export {
  REELS_AUTOPLAY_THRESHOLD,
  REELS_AUTOPAUSE_THRESHOLD,
  REELS_CACHE_BEHIND,
  REELS_CACHE_AHEAD,
  REELS_MEDIA_DISTANCE,
  REELS_SCROLL_SETTLE_MS,
  REELS_DETACH_AFTER_MS,
  REELS_ATTACH_WATCHDOG_MS,
  REELS_PRELOAD_AHEAD,
  REELS_PAGE_SIZE,
  REELS_PREFETCH_REMAINING,
  REELS_LOOP_MAX_SEC,
  REELS_H_NAV_DURATION_MS,
} from "@/lib/reels/constants";

export { reelShouldHoldSrc } from "@/lib/reels/attach-policy";

export type { ReelItem, ReelMedia, ReelAuthor, ReelsPageResponse } from "@/lib/reels/types";

export {
  isHlsUrl,
  resolveReelPlaybackSrc,
  hlsStartLevelForNetwork,
  reelPreloadForDistance,
} from "@/lib/reels/playback-url";

export { dismissReel, getDismissedReelIds, isReelDismissed } from "@/lib/reels/dismissed";
