import test from "node:test";
import assert from "node:assert/strict";
import { needsClientTranslation } from "@/lib/client-translate/detect-source";
import { languageForCountry } from "@/lib/client-translate/country-language";
import { COUNTRIES } from "@/lib/i18n/countries";
import {
  defaultPostTranslateFromBrowser,
  inferPostTranslateInto,
  likelyWarmupModel,
  resolveOpusModel,
} from "@/lib/client-translate/opus-mt-pairs";

test("browser Korean translates posts into Korean", () => {
  assert.equal(defaultPostTranslateFromBrowser("ko-KR"), "ko");
  assert.equal(defaultPostTranslateFromBrowser("ko"), "ko");
  assert.equal(defaultPostTranslateFromBrowser("ja-JP"), "ja");
});

test("country picks the translation language over the browser", () => {
  assert.equal(inferPostTranslateInto("en-US", "KR"), "ko");
  assert.equal(inferPostTranslateInto("ko", "JP"), "ja");
  assert.equal(inferPostTranslateInto("ja-JP", "US"), "en");
  assert.equal(inferPostTranslateInto("en-US", "TH"), "th");
  assert.equal(inferPostTranslateInto("en-US", "BR"), "pt");
  assert.equal(inferPostTranslateInto("", "DE"), "de");
  assert.equal(inferPostTranslateInto("ja", ""), "ja");
});

test("every selectable country has a translation language", () => {
  for (const country of COUNTRIES) {
    if (country.code === "OTHER") {
      assert.equal(languageForCountry(country.code), null);
      continue;
    }
    const language = languageForCountry(country.code);
    assert.equal(typeof language, "string", country.code);
    assert.match(language ?? "", /^[a-z]{2,3}$/, country.code);
  }
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

test("any original language can translate into the viewer's language", () => {
  assert.equal(needsClientTranslation("신발팔아요", "en"), true);
  assert.equal(needsClientTranslation("Selling shoes today", "ja"), true);
  assert.equal(needsClientTranslation("신발팔아요", "ja"), true);
  assert.equal(needsClientTranslation("愛という感情は言葉だけでは足りない。", "ja"), false);
  assert.equal(needsClientTranslation("你好，今天天气真不错啊", "ko"), true);
  assert.equal(needsClientTranslation("Selling shoes today", "ko"), true);
  assert.equal(needsClientTranslation("Die Liebe ist ein tiefes Gefühl zwischen Menschen.", "ko"), true);
  assert.equal(needsClientTranslation("Die Liebe ist ein tiefes Gefühl zwischen Menschen.", "de"), false);
  assert.equal(needsClientTranslation("신발팔아요", "off"), false);
  assert.equal(needsClientTranslation("Selling shoes today", "en"), false);
  assert.equal(needsClientTranslation("신발팔아요", "ko"), false);
});
