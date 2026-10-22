import test from "node:test";
import assert from "node:assert/strict";
import { mouthFromVolume, parseVrmEmotion, readHostEmotionReply } from "@/lib/ai-live/vrm-expression";

test("host JSON splits the spoken line from the face", () => {
  const parsed = readHostEmotionReply('{"text":"야! 너 밴 당하고 싶냐 ㅋㅋㅋ","emotion":"angry"}');
  assert.equal(parsed?.text, "야! 너 밴 당하고 싶냐 ㅋㅋㅋ");
  assert.equal(parsed?.emotion, "angry");
});

test("a fenced or unknown emotion falls back without dropping the line", () => {
  const fenced = readHostEmotionReply('```json\n{"text":"Hello.","emotion":"NOPE"}\n```');
  assert.equal(fenced?.text, "Hello.");
  assert.equal(fenced?.emotion, "neutral");
  assert.equal(parseVrmEmotion(" Happy "), "happy");
  assert.equal(readHostEmotionReply("그냥 말해")?.emotion, "neutral");
  assert.equal(readHostEmotionReply("{not json"), null);
});

test("mouth shape follows volume bands", () => {
  assert.deepEqual(mouthFromVolume(0), { aa: 0, ih: 0, ou: 0 });
  assert.equal(mouthFromVolume(0.2).ih > 0, true);
  assert.equal(mouthFromVolume(0.2).aa, 0);
  assert.equal(mouthFromVolume(0.45).ou > 0, true);
  assert.equal(mouthFromVolume(0.45).ih, 0);
  assert.equal(mouthFromVolume(0.6).aa, 0.6);
  assert.equal(mouthFromVolume(1).aa, 1);
  assert.equal(mouthFromVolume(1).ou, 0);
});
