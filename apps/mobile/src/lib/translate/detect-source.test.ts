import test from "node:test";
import assert from "node:assert/strict";
import {
  detectSourceMlKit,
  needsClientTranslation,
} from "@/lib/translate/detect-source";
import { MlLang } from "@/lib/translate/mlkit-locale";

const FRENCH =
  "La vie est belle quand on partage de bons moments avec les amis autour d'un café.";
const GERMAN =
  "Die Liebe ist ein tiefes Gefühl zwischen Menschen und verbindet uns alle.";
const ENGLISH = "Selling shoes today at the market downtown.";

test("French posts are not misclassified as English", () => {
  assert.equal(detectSourceMlKit(FRENCH), MlLang.FRENCH);
  assert.equal(needsClientTranslation(FRENCH, "en"), true);
  assert.equal(needsClientTranslation(FRENCH, "fr"), false);
  assert.equal(needsClientTranslation(FRENCH, "ja"), true);
});

test("German and English detection still works", () => {
  assert.equal(detectSourceMlKit(GERMAN), MlLang.GERMAN);
  assert.equal(detectSourceMlKit(ENGLISH), MlLang.ENGLISH);
  assert.equal(needsClientTranslation(ENGLISH, "en"), false);
  assert.equal(needsClientTranslation(GERMAN, "ko"), true);
});

test("Korean and Japanese heuristics are unchanged", () => {
  assert.equal(detectSourceMlKit("신발팔아요"), MlLang.KOREAN);
  assert.equal(detectSourceMlKit("愛という感情は言葉だけでは足りない。"), MlLang.JAPANESE);
  assert.equal(needsClientTranslation("신발팔아요", "ko"), false);
});
