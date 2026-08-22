import test from "node:test";
import assert from "node:assert/strict";
import {
  rewritePaidVideoSrc,
  paidMediaPlaybackPath,
  paidMediaPreviewPath,
  clampPaidPreviewRange,
  resolveClientPaidMediaSrc,
} from "@/lib/paid-media-playback";

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
  assert.equal(out.url, paidMediaPreviewPath("media_1"));
  assert.equal(out.hlsUrl, null);
});

test("locked paid image does not leak the origin url", () => {
  const out = rewritePaidVideoSrc({
    id: "media_1",
    url: "https://cdn.example/photo.jpg",
    type: "IMAGE",
    priceKrw: 3000,
    locked: true,
    posterUrl: "https://cdn.example/poster.jpg",
  });
  assert.equal(out.url, paidMediaPreviewPath("media_1"));
  assert.equal(out.hlsUrl, null);
  assert.equal(out.posterUrl, null);
});

test("preview range is capped so the full file cannot be streamed", () => {
  assert.equal(clampPaidPreviewRange(null, 1000), "bytes=0-999");
  assert.equal(clampPaidPreviewRange("bytes=0-999999", 1000), "bytes=0-999");
  assert.equal(clampPaidPreviewRange("bytes=200-400", 1000), "bytes=200-400");
  assert.equal(clampPaidPreviewRange("bytes=9000-", 1000), "bytes=999-999");
});

test("paid unlocked image is rewritten to the same-origin gate", () => {
  const out = rewritePaidVideoSrc({
    id: "media_img",
    url: "https://cdn.example/photo.jpg",
    type: "IMAGE",
    priceKrw: 3000,
    locked: false,
  });
  assert.equal(out.url, paidMediaPlaybackPath("media_img"));
  assert.equal(out.hlsUrl, null);
});

test("unlocked client src upgrades preview or empty url to full playback", () => {
  assert.equal(
    resolveClientPaidMediaSrc({
      url: paidMediaPreviewPath("media_1"),
      mediaId: "media_1",
      locked: false,
      priceKrw: 3000,
    }),
    paidMediaPlaybackPath("media_1")
  );
  assert.equal(
    resolveClientPaidMediaSrc({
      url: "",
      mediaId: "media_1",
      locked: false,
      priceKrw: 3000,
    }),
    paidMediaPlaybackPath("media_1")
  );
  assert.equal(
    resolveClientPaidMediaSrc({
      url: "",
      mediaId: "media_1",
      locked: true,
      priceKrw: 3000,
    }),
    paidMediaPreviewPath("media_1")
  );
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
