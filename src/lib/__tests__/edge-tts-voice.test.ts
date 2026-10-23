import test from "node:test";
import assert from "node:assert/strict";
import { edgeVoiceForText, edgeVoiceName, voiceStyleForCharacter } from "@/lib/ai-live/edge-tts";
import { speechLangForText } from "@/lib/ai-live/speech-lang";

test("Edge voices follow the spoken language", () => {
  assert.equal(speechLangForText("\uC548\uB155, \uBAA8\uCF54\uC57C."), "ko");
  assert.equal(edgeVoiceName(edgeVoiceForText("\uC548\uB155, \uBAA8\uCF54\uC57C.")), "ko-KR-SunHiNeural");
  assert.equal(edgeVoiceName(edgeVoiceForText("Hello there.")), "en-US-JennyNeural");
  assert.equal(edgeVoiceName(edgeVoiceForText("\u3053\u3093\u306B\u3061\u306F")), "ja-JP-NanamiNeural");
});

test("only Moco raises pitch and rate", () => {
  assert.deepEqual(voiceStyleForCharacter(null), { pitch: "+18%", rate: "+10%" });
  assert.deepEqual(voiceStyleForCharacter("moco"), { pitch: "+18%", rate: "+10%" });
  assert.deepEqual(voiceStyleForCharacter("airi"), { pitch: "default", rate: "default" });
  assert.deepEqual(voiceStyleForCharacter("chloe"), { pitch: "default", rate: "default" });
  assert.deepEqual(voiceStyleForCharacter("stella"), { pitch: "default", rate: "default" });
});
