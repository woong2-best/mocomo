import test from "node:test";
import assert from "node:assert/strict";
import { getVideoPlaybackController } from "@/lib/video-playback";

if (!(globalThis as { window?: unknown }).window) {
  Object.defineProperty(globalThis, "window", {
    value: globalThis,
    configurable: true,
  });
}

function fakeVideo(playing = false): HTMLVideoElement {
  let paused = !playing;
  return {
    get paused() {
      return paused;
    },
    get ended() {
      return false;
    },
    play: async () => {
      paused = false;
    },
    pause: () => {
      paused = true;
    },
  } as HTMLVideoElement;
}

test("autoplay does not steal from another playing feed video", async () => {
  const ctrl = getVideoPlaybackController();
  assert.ok(ctrl);
  ctrl.pauseAll();

  const a = fakeVideo();
  const b = fakeVideo();
  ctrl.register({ id: "fv-a", getVideo: () => a, autoplayIntent: true });
  ctrl.register({ id: "fv-b", getVideo: () => b, autoplayIntent: true });

  assert.equal(await ctrl.requestPlay("fv-a", "autoplay"), true);
  assert.equal(a.paused, false);
  assert.equal(await ctrl.requestPlay("fv-b", "autoplay"), false);
  assert.equal(a.paused, false);
  assert.equal(b.paused, true);

  ctrl.unregister("fv-a");
  ctrl.unregister("fv-b");
  ctrl.pauseAll();
});

test("user tap and reel autoplay may take over a feed video", async () => {
  const ctrl = getVideoPlaybackController();
  assert.ok(ctrl);
  ctrl.pauseAll();

  const feed = fakeVideo();
  const reel = fakeVideo();
  ctrl.register({ id: "fv-feed", getVideo: () => feed, autoplayIntent: true });
  ctrl.register({ id: "reel-1", getVideo: () => reel, autoplayIntent: true });

  assert.equal(await ctrl.requestPlay("fv-feed", "autoplay"), true);
  assert.equal(await ctrl.requestPlay("reel-1", "autoplay"), true);
  assert.equal(feed.paused, true);
  assert.equal(reel.paused, false);

  ctrl.unregister("fv-feed");
  ctrl.unregister("reel-1");
  ctrl.pauseAll();
});
