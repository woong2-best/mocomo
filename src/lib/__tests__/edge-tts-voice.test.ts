import test from "node:test";
import assert from "node:assert/strict";
import { edgeVoiceForText, edgeVoiceName, edgeWebsocketAllowed, ttsProviderOrder, voiceStyleForCharacter } from "@/lib/ai-live/edge-tts";
import { AIRI_MAYU_VOICE, speechLangForText, toKatakana, wrapAiriMayuSsml } from "@/lib/ai-live/speech-lang";

test("Edge voices follow the spoken language", () => {
  assert.equal(speechLangForText("\uC548\uB155, \uBAA8\uCF54\uC57C."), "ko");
  assert.equal(edgeVoiceName(edgeVoiceForText("\uC548\uB155, \uBAA8\uCF54\uC57C.")), "ko-KR-SunHiNeural");
  assert.equal(edgeVoiceName(edgeVoiceForText("Hello there.")), "en-US-JennyNeural");
  assert.equal(edgeVoiceName(edgeVoiceForText("\u3053\u3093\u306B\u3061\u306F")), "ja-JP-NanamiNeural");
});

test("Moco is brighter, Chloe stays tipsy-slow, AIRI is husky Mayu", () => {
  assert.deepEqual(voiceStyleForCharacter(null), { pitch: "+18%", rate: "+10%" });
  assert.deepEqual(voiceStyleForCharacter("moco"), { pitch: "+18%", rate: "+10%" });
  assert.deepEqual(voiceStyleForCharacter("chloe"), { pitch: "+18%", rate: "-12%" });
  assert.deepEqual(voiceStyleForCharacter("airi"), { pitch: "-15%", rate: "+5%" });
  assert.deepEqual(voiceStyleForCharacter("stella"), { pitch: "default", rate: "default" });
});

test("Vercel skips the Edge websocket so speak cannot 504", () => {
  assert.equal(edgeWebsocketAllowed({}), true);
  assert.equal(edgeWebsocketAllowed({ VERCEL: "1" }), false);
  assert.deepEqual(ttsProviderOrder({}), ["edge", "streamelements", "google"]);
  assert.deepEqual(ttsProviderOrder({ VERCEL: "1" }), ["streamelements", "google"]);
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
