import test from "node:test";
import assert from "node:assert/strict";
import { edgeVoiceForText, edgeVoiceName, edgeWebsocketAllowed, ttsProviderOrder, voiceStyleForCharacter } from "@/lib/ai-live/edge-tts";
import {
  AIRI_MAYU_VOICE,
  NANGNANG_UNKNOWN_LANG,
  NANGNANG_XIAOYI_VOICE,
  ZELIE_ELOISE_VOICE,
  ZELIE_SEOHYEON_VOICE,
  dedicatedEdgeVoice,
  speechLangForText,
  textLooksChinese,
  textLooksFrench,
  zelieInputLang,
  toKatakana,
  wrapAiriMayuSsml,
} from "@/lib/ai-live/speech-lang";

test("Edge voices follow the spoken language", () => {
  assert.equal(speechLangForText("\uC548\uB155, \uBAA8\uCF54\uC57C."), "ko");
  assert.equal(edgeVoiceName(edgeVoiceForText("\uC548\uB155, \uBAA8\uCF54\uC57C.")), "ko-KR-SunHiNeural");
  assert.equal(edgeVoiceName(edgeVoiceForText("Hello there.")), "en-US-JennyNeural");
  assert.equal(edgeVoiceName(edgeVoiceForText("\u3053\u3093\u306B\u3061\u306F")), "ja-JP-NanamiNeural");
});

test("Moco is brighter, Chloe stays tipsy-slow, AIRI is husky Mayu", () => {
  assert.deepEqual(voiceStyleForCharacter(null), { pitch: "+18%", rate: "+10%" });
  assert.deepEqual(voiceStyleForCharacter("moco"), { pitch: "+18%", rate: "+10%" });
  assert.deepEqual(voiceStyleForCharacter("zelie"), { pitch: "+18%", rate: "+10%" });
  assert.deepEqual(voiceStyleForCharacter("chloe"), { pitch: "+18%", rate: "-12%" });
  assert.deepEqual(voiceStyleForCharacter("mio"), { pitch: "+18%", rate: "-12%" });
  assert.deepEqual(voiceStyleForCharacter("airi"), { pitch: "-15%", rate: "+5%" });
  assert.deepEqual(voiceStyleForCharacter("cleo"), { pitch: "-15%", rate: "+5%" });
  assert.deepEqual(voiceStyleForCharacter("stella"), { pitch: "default", rate: "default" });
  assert.deepEqual(voiceStyleForCharacter("nangnang"), { pitch: "default", rate: "default" });
});

test("Nangnang only treats Chinese chat as her language", () => {
  assert.equal(textLooksChinese("今天打赏好甜"), true);
  assert.equal(textLooksChinese("안녕 낭낭"), false);
  assert.equal(textLooksChinese("hello nangnang"), false);
  assert.equal(textLooksChinese("こんにちは"), false);
  assert.equal(NANGNANG_UNKNOWN_LANG, "这语言我不会，说中文。");
});

test("Nangnang uses Microsoft Xiaoyi on Edge and StreamElements", () => {
  assert.equal(NANGNANG_XIAOYI_VOICE, "zh-CN-XiaoyiNeural");
  assert.deepEqual(dedicatedEdgeVoice("nangnang"), { voice: "zh-CN-XiaoyiNeural", lang: "zh-CN" });
  assert.deepEqual(dedicatedEdgeVoice("stella"), { voice: "zh-CN-XiaoyiNeural", lang: "zh-CN" });
  assert.deepEqual(dedicatedEdgeVoice("airi"), { voice: "ja-JP-MayuNeural", lang: "ja-JP" });
  assert.equal(ZELIE_SEOHYEON_VOICE, "ko-KR-SeoHyeonNeural");
  assert.equal(ZELIE_ELOISE_VOICE, "fr-FR-EloiseNeural");
  assert.deepEqual(dedicatedEdgeVoice("zelie", "ko"), { voice: "ko-KR-SeoHyeonNeural", lang: "ko-KR" });
  assert.deepEqual(dedicatedEdgeVoice("moco", "fr"), { voice: "fr-FR-EloiseNeural", lang: "fr-FR" });
});

test("Zelie only treats Korean and French as her languages", () => {
  assert.equal(zelieInputLang("안녕 젤리"), "ko");
  assert.equal(zelieInputLang("bonjour ça va"), "fr");
  assert.equal(zelieInputLang("hello zelie"), null);
  assert.equal(zelieInputLang("こんにちは"), null);
  assert.equal(textLooksFrench("Merci beaucoup"), true);
  assert.equal(textLooksFrench("hello there"), false);
});

test("Vercel skips the Edge websocket so speak cannot 504", () => {
  assert.equal(edgeWebsocketAllowed(""), true);
  assert.equal(edgeWebsocketAllowed("1"), false);
  assert.deepEqual(ttsProviderOrder(""), ["edge", "streamelements", "google"]);
  assert.deepEqual(ttsProviderOrder("1"), ["streamelements", "google"]);
});

test("AIRI SSML uses Mayu with a lowered pitch", () => {
  assert.equal(AIRI_MAYU_VOICE, "ja-JP-MayuNeural");
  assert.equal(toKatakana("こんにちは"), "コンニチハ");
  const ssml = wrapAiriMayuSsml("こんにちは & あい");
  assert.match(ssml, /xml:lang="ja-JP"/);
  assert.match(ssml, /<voice name="ja-JP-MayuNeural">/);
  assert.match(ssml, /<prosody pitch="-15%" rate="\+5%">/);
  assert.match(ssml, /コンニチハ &amp; アイ/);
});
