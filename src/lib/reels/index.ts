export {
  REELS_AUTOPLAY_THRESHOLD,
  REELS_AUTOPAUSE_THRESHOLD,
  REELS_CACHE_BEHIND,
  REELS_CACHE_AHEAD,
  REELS_PRELOAD_AHEAD,
  REELS_PAGE_SIZE,
  REELS_PREFETCH_REMAINING,
  REELS_LOOP_MAX_SEC,
} from "@/lib/reels/constants";

export type { ReelItem, ReelMedia, ReelAuthor, ReelsPageResponse } from "@/lib/reels/types";

export {
  isHlsUrl,
  resolveReelPlaybackSrc,
  hlsStartLevelForNetwork,
  reelPreloadForDistance,
} from "@/lib/reels/playback-url";

export { dismissReel, getDismissedReelIds, isReelDismissed } from "@/lib/reels/dismissed";
