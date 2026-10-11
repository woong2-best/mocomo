import test from "node:test";
import assert from "node:assert/strict";
import {
  getCachedFullTranslation,
  getCachedTranslation,
  setCachedFullTranslation,
  setCachedTranslation,
} from "@/lib/client-translate/cache";
import { lookupCachedClientTranslation } from "@/lib/client-translate/engine";

test("chunk cache returns the stored translation", () => {
  setCachedTranslation("kor_Hang", "en", "신발팔아요", "Selling shoes");
  assert.equal(getCachedTranslation("kor_Hang", "en", "신발팔아요"), "Selling shoes");
  assert.equal(getCachedTranslation("kor_Hang", "en", "다른글"), null);
});

test("full cache stores source language with the translated text", () => {
  setCachedFullTranslation("kor_Hang", "en", "오늘 날씨 좋다", {
    translated: "The weather is nice today",
    sourceLang: "ko",
    sourceNllb: "kor_Hang",
  });
  const hit = getCachedFullTranslation("kor_Hang", "en", "오늘 날씨 좋다");
  assert.equal(hit?.translated, "The weather is nice today");
  assert.equal(hit?.sourceLang, "ko");
  assert.equal(hit?.sourceNllb, "kor_Hang");
});

test("lookup returns a cached full translation without loading a model", async () => {
  setCachedFullTranslation("kor_Hang", "en", "오늘 날씨 좋다", {
    translated: "The weather is nice today",
    sourceLang: "ko",
    sourceNllb: "kor_Hang",
  });
  const hit = await lookupCachedClientTranslation("오늘 날씨 좋다", "en");
  assert.equal(hit?.translated, "The weather is nice today");
  assert.equal(hit?.sourceLang, "ko");
});
