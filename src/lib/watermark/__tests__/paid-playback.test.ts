import test from "node:test";
import assert from "node:assert/strict";
import { rewritePaidVideoSrc, paidMediaPlaybackPath } from "@/lib/paid-media-playback";

test("paid unlocked video is rewritten to the same-origin gate", () => {
  const out = rewritePaidVideoSrc({
    id: "media_1",
    url: "https://cdn.example/video.mp4",
    type: "VIDEO",
    priceKrw: 3000,
    locked: false,
    hlsUrl: "https://cdn.example/video.m3u8",
  });
  assert.equal(out.url, paidMediaPlaybackPath("media_1"));
  assert.equal(out.hlsUrl, null);
});

test("locked paid video does not leak the origin url", () => {
  const out = rewritePaidVideoSrc({
    id: "media_1",
    url: "https://cdn.example/video.mp4",
    type: "VIDEO",
    priceKrw: 3000,
    locked: true,
    hlsUrl: "https://cdn.example/video.m3u8",
  });
  assert.equal(out.url, "");
  assert.equal(out.hlsUrl, null);
});

test("free video keeps its stored url", () => {
  const out = rewritePaidVideoSrc({
    id: "media_1",
    url: "https://cdn.example/free.mp4",
    type: "VIDEO",
    priceKrw: 0,
    locked: false,
    hlsUrl: "https://cdn.example/free.m3u8",
  });
  assert.equal(out.url, "https://cdn.example/free.mp4");
  assert.equal(out.hlsUrl, "https://cdn.example/free.m3u8");
});
