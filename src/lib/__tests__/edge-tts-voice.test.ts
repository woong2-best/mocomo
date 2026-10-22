import test from "node:test";
import assert from "node:assert/strict";
import { edgeVoiceForText, edgeVoiceName } from "@/lib/ai-live/edge-tts";

test("Edge voices follow the spoken language", () => {
  assert.equal(edgeVoiceName(edgeVoiceForText("\uC548\uB155, \uBAA8\uCF54\uC57C.")), "ko-KR-SunHiNeural");
  assert.equal(edgeVoiceName(edgeVoiceForText("Hello there.")), "en-US-JennyNeural");
  assert.equal(edgeVoiceName(edgeVoiceForText("\u3053\u3093\u306B\u3061\u306F")), "ja-JP-NanamiNeural");
});
