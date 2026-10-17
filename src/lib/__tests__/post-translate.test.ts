import test from "node:test";
import assert from "node:assert/strict";
import { needsClientTranslation } from "@/lib/client-translate/detect-source";
import {
  defaultPostTranslateFromBrowser,
  inferPostTranslateInto,
  likelyWarmupModel,
  resolveOpusModel,
} from "@/lib/client-translate/opus-mt-pairs";

test("browser Korean translates posts into Korean", () => {
  assert.equal(defaultPostTranslateFromBrowser("ko-KR"), "ko");
  assert.equal(defaultPostTranslateFromBrowser("ko"), "ko");
});

test("country fills in only when the browser language has no target", () => {
  assert.equal(inferPostTranslateInto("ko-KR", "US"), "ko");
  assert.equal(inferPostTranslateInto("ko", "KR"), "ko");
  assert.equal(inferPostTranslateInto("th", "KR"), "ko");
  assert.equal(inferPostTranslateInto("ja-JP", "US"), "ja");
});

test("browser English and Japanese map to listed targets", () => {
  assert.equal(defaultPostTranslateFromBrowser("en-US"), "en");
  assert.equal(defaultPostTranslateFromBrowser("ja"), "ja");
  assert.equal(defaultPostTranslateFromBrowser("zh-TW"), "zh");
});

test("direct Opus-MT pairs exist both ways for English and Japanese", () => {
  assert.equal(resolveOpusModel("ko", "en"), "Xenova/opus-mt-ko-en");
  assert.equal(resolveOpusModel("en", "ja"), "Xenova/opus-mt-en-jap");
  assert.equal(resolveOpusModel("en", "ko"), null);
  assert.equal(resolveOpusModel("ko", "ja"), null);
});

test("warmup prefers the Korean-to-English pair for English viewers", () => {
  assert.equal(likelyWarmupModel("en"), "Xenova/opus-mt-ko-en");
  assert.equal(likelyWarmupModel("ja"), "Xenova/opus-mt-en-jap");
  assert.equal(likelyWarmupModel("off"), null);
});

test("translation is needed when post language differs and a pair exists", () => {
  assert.equal(needsClientTranslation("신발팔아요", "en"), true);
  assert.equal(needsClientTranslation("Selling shoes today", "ja"), true);
  assert.equal(needsClientTranslation("신발팔아요", "ja"), false);
  assert.equal(needsClientTranslation("신발팔아요", "off"), false);
  assert.equal(needsClientTranslation("Selling shoes today", "en"), false);
  assert.equal(needsClientTranslation("Selling shoes today", "ko"), true);
  assert.equal(needsClientTranslation("愛という感情は言葉だけでは足りない。", "ko"), true);
  assert.equal(needsClientTranslation("신발팔아요", "ko"), false);
});
