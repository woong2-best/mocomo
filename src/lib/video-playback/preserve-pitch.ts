/**
 * Keep vocal pitch when playbackRate ≠ 1.
 * Browsers time-stretch / pitch-correct in the client (no extra server audio).
 * Safari still uses webkitPreservesPitch; Firefox historically used mozPreservesPitch.
 */
export type PitchPreservingMedia = HTMLMediaElement & {
  preservesPitch?: boolean;
  webkitPreservesPitch?: boolean;
  mozPreservesPitch?: boolean;
};

export function enablePitchPreservingPlayback(
  media: HTMLMediaElement | null | undefined
): void {
  if (!media) return;
  const v = media as PitchPreservingMedia;
  v.preservesPitch = true;
  v.webkitPreservesPitch = true;
  v.mozPreservesPitch = true;
}

export function applyPitchPreservingPlaybackRate(
  media: HTMLMediaElement | null | undefined,
  rate: number
): void {
  if (!media) return;
  enablePitchPreservingPlayback(media);
  media.playbackRate = rate;
}
