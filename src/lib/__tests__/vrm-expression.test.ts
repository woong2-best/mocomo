import test from "node:test";
import assert from "node:assert/strict";
import {
  isChloeCharacter,
  mouthFromVolume,
  parseVrmEmotion,
  readHostEmotionReply,
  setupChloeDrunkState,
} from "@/lib/ai-live/vrm-expression";

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

test("Chloe idle keeps a tipsy smile", () => {
  const values = new Map<string, number>();
  const vrm = {
    expressionManager: {
      getExpression: () => ({ userData: {}, overrideMouth: "blend" }),
      setValue: (name: string, value: number) => {
        values.set(name, value);
      },
    },
  };
  setupChloeDrunkState(vrm as never);
  assert.equal(isChloeCharacter("CHLOE"), true);
  assert.equal(isChloeCharacter("airi"), false);
  assert.equal(values.get("happy"), 0.5);
  assert.equal(values.get("relaxed"), 0.3);
});
