import test from "node:test";
import assert from "node:assert/strict";
import { getGiphyApiKey, mapGiphyRow, resolveGiphyPlatform } from "@/lib/giphy";

test("getGiphyApiKey picks the platform env without falling across unrelated keys", () => {
  const prev = {
    web: process.env.GIPHY_API_KEY_WEB,
    android: process.env.GIPHY_API_KEY_ANDROID,
    ios: process.env.GIPHY_API_KEY_IOS,
  };
  process.env.GIPHY_API_KEY_WEB = "web-key";
  process.env.GIPHY_API_KEY_ANDROID = "android-key";
  process.env.GIPHY_API_KEY_IOS = "ios-key";
  try {
    assert.equal(getGiphyApiKey("web"), "web-key");
    assert.equal(getGiphyApiKey("android"), "android-key");
    assert.equal(getGiphyApiKey("ios"), "ios-key");
  } finally {
    process.env.GIPHY_API_KEY_WEB = prev.web;
    process.env.GIPHY_API_KEY_ANDROID = prev.android;
    process.env.GIPHY_API_KEY_IOS = prev.ios;
  }
});

test("Giphy rows prefer GIF URLs so Android can paint the picker tiles", () => {
  const item = mapGiphyRow({
    id: "abc",
    images: {
      fixed_height_small: {
        url: "https://media.giphy.com/media/abc/100.gif",
        webp: "https://media.giphy.com/media/abc/100.webp",
      },
      fixed_height: {
        url: "https://media.giphy.com/media/abc/200.gif",
        webp: "https://media.giphy.com/media/abc/200.webp",
        mp4: "https://media.giphy.com/media/abc/200.mp4",
      },
    },
  });
  assert.deepEqual(item, {
    id: "abc",
    previewUrl: "https://media.giphy.com/media/abc/100.gif",
    playUrl: "https://media.giphy.com/media/abc/200.gif",
  });
});

test("resolveGiphyPlatform prefers the app header over the user agent", () => {
  assert.equal(resolveGiphyPlatform({ header: "ios", userAgent: "Mozilla/5.0 Android" }), "ios");
  assert.equal(resolveGiphyPlatform({ header: "android" }), "android");
  assert.equal(resolveGiphyPlatform({ header: null, userAgent: "MoCoMo iPhone" }), "ios");
  assert.equal(resolveGiphyPlatform({ header: null, userAgent: "Mozilla/5.0" }), "web");
});
