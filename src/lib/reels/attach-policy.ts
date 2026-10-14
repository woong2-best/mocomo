import { REELS_MEDIA_DISTANCE } from "@/lib/reels/constants";

/**
 * Whether this reel may keep / start a media `src`.
 *
 * New downloads wait for the scroller to rest so a fast fling does not
 * attach-then-abort every skipped clip (Chrome media cache poison).
 * A clip that is already attached stays until it leaves the nearby window.
 */
export function reelShouldHoldSrc(input: {
  distance: number;
  settled: boolean;
  alreadyAttached: boolean;
}): boolean {
  if (input.distance > REELS_MEDIA_DISTANCE) return false;
  if (input.alreadyAttached) return true;
  return input.settled;
}
