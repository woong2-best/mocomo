import test from "node:test";
import assert from "node:assert/strict";
import { needsClientTranslation } from "@/lib/client-translate/detect-source";
import {
  defaultPostTranslateFromBrowser,
  inferPostTranslateInto,
  resolveOpusModel,
} from "@/lib/client-translate/opus-mt-pairs";

test("browser Korean has no Opus-MT target so defaults to Don't translate", () => {
  assert.equal(defaultPostTranslateFromBrowser("ko-KR"), "off");
  assert.equal(defaultPostTranslateFromBrowser("ko"), "off");
});

test("US country infers English when the browser language has no target model", () => {
  assert.equal(inferPostTranslateInto("ko-KR", "US"), "en");
  assert.equal(inferPostTranslateInto("ko", "KR"), "off");
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

test("translation is needed when post language differs and a pair exists", () => {
  assert.equal(needsClientTranslation("신발팔아요", "en"), true);
  assert.equal(needsClientTranslation("Selling shoes today", "ja"), true);
  assert.equal(needsClientTranslation("신발팔아요", "ja"), false);
  assert.equal(needsClientTranslation("신발팔아요", "off"), false);
  assert.equal(needsClientTranslation("Selling shoes today", "en"), false);
});
