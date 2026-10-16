import type { VideoPlayer } from "expo-video";

/**
 * Keep vocal pitch when playbackRate ≠ 1.
 * expo-video Android defaults preservesPitch=false (chipmunk); iOS/web default true.
 * Time-stretch / pitch-correct runs on-device (ExoPlayer / AVPlayer), not on the server.
 */
export function enablePitchPreservingPlayback(player: VideoPlayer): void {
  player.preservesPitch = true;
}

export function setPitchPreservingPlaybackRate(player: VideoPlayer, rate: number): void {
  enablePitchPreservingPlayback(player);
  player.playbackRate = rate;
}
