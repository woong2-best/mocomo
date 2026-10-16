import test from "node:test";
import assert from "node:assert/strict";
import {
  applyPitchPreservingPlaybackRate,
  enablePitchPreservingPlayback,
  type PitchPreservingMedia,
} from "@/lib/video-playback/preserve-pitch";

function fakeMedia(): PitchPreservingMedia {
  return {
    playbackRate: 1,
    preservesPitch: false,
    webkitPreservesPitch: false,
    mozPreservesPitch: false,
  } as PitchPreservingMedia;
}

test("enablePitchPreservingPlayback turns on vendor pitch flags", () => {
  const media = fakeMedia();
  enablePitchPreservingPlayback(media);
  assert.equal(media.preservesPitch, true);
  assert.equal(media.webkitPreservesPitch, true);
  assert.equal(media.mozPreservesPitch, true);
});

test("applyPitchPreservingPlaybackRate sets flags before the new rate", () => {
  const media = fakeMedia();
  applyPitchPreservingPlaybackRate(media, 2);
  assert.equal(media.preservesPitch, true);
  assert.equal(media.playbackRate, 2);
});
