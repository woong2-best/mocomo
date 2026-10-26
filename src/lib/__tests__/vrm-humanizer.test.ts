import test from "node:test";
import assert from "node:assert/strict";
import { CHARACTER_CONFIGS, resolveCharacterConfig } from "@/lib/vrm-humanizer/CharacterConfigs";
import {
  breathingScale,
  resolveFsmState,
  rmsAmplitudeScale,
  shouldBoostSaccade,
  shouldTriggerReflexBlink,
  slerpAlpha,
} from "@/lib/vrm-humanizer/math";

test("character aliases resolve to the four live avatars", () => {
  assert.equal(resolveCharacterConfig("moco").id, "zelie");
  assert.equal(resolveCharacterConfig("airi").id, "cleo");
  assert.equal(resolveCharacterConfig("chloe").id, "mio");
  assert.equal(resolveCharacterConfig("stella").id, "nangnang");
  assert.equal(resolveCharacterConfig(null).id, "zelie");
});

test("each avatar keeps a distinct posture and habit profile", () => {
  assert.equal(CHARACTER_CONFIGS.zelie.posture.spine.x, 0);
  assert.equal(CHARACTER_CONFIGS.zelie.posture.hips.y, 0);
  assert.ok(CHARACTER_CONFIGS.zelie.habits.hairTuckInterval);
  assert.equal(CHARACTER_CONFIGS.zelie.habits.lipTouch, true);

  assert.ok(CHARACTER_CONFIGS.cleo.posture.hips.y >= 2);
  assert.ok(CHARACTER_CONFIGS.cleo.posture.leftShoulder.z !== CHARACTER_CONFIGS.cleo.posture.rightShoulder.z);
  assert.ok(CHARACTER_CONFIGS.cleo.saccade.macroChance > CHARACTER_CONFIGS.zelie.saccade.macroChance);
  assert.equal(CHARACTER_CONFIGS.cleo.habits.airGuitar, true);

  assert.ok(CHARACTER_CONFIGS.mio.posture.neck.x > 6);
  assert.ok(CHARACTER_CONFIGS.mio.rms.explosionAmpMul >= 3);
  assert.ok(CHARACTER_CONFIGS.mio.saccade.blinkIntervalMin < CHARACTER_CONFIGS.zelie.saccade.blinkIntervalMin);
  assert.ok(CHARACTER_CONFIGS.mio.saccade.blinkIntervalMax < CHARACTER_CONFIGS.zelie.saccade.blinkIntervalMax);
  assert.ok(CHARACTER_CONFIGS.mio.saccade.eyeContactHoldSec <= 2);

  assert.equal(CHARACTER_CONFIGS.nangnang.weightShift.intervalMinSec, 10);
  assert.equal(CHARACTER_CONFIGS.nangnang.weightShift.intervalMaxSec, 15);
  assert.ok(CHARACTER_CONFIGS.nangnang.breathing.speed > CHARACTER_CONFIGS.zelie.breathing.speed);
  assert.equal(CHARACTER_CONFIGS.nangnang.habits.checkPhoneSilenceSec, 15);
  assert.equal(CHARACTER_CONFIGS.nangnang.habits.checkPhoneJoy, 0.3);
  assert.ok(CHARACTER_CONFIGS.nangnang.habits.bodySwayAmp > CHARACTER_CONFIGS.zelie.habits.bodySwayAmp);
});

test("speaking wins over thinking in the FSM", () => {
  assert.equal(resolveFsmState(false, false), "idle");
  assert.equal(resolveFsmState(false, true), "thinking");
  assert.equal(resolveFsmState(true, true), "speaking");
});

test("breathing scale stays inside the chest band", () => {
  for (let i = 0; i < 16; i += 1) {
    const scale = breathingScale(i * 0.37, 1.15, 1, 1.015);
    assert.ok(scale >= 1 && scale <= 1.015);
  }
});

test("weight-shift slerp uses a smoothstep envelope", () => {
  assert.equal(slerpAlpha(0, 2), 0);
  assert.equal(slerpAlpha(2, 2), 1);
  assert.ok(slerpAlpha(1, 2) > 0.4 && slerpAlpha(1, 2) < 0.6);
});

test("RMS tension scales amplitude and Mio explodes past the threshold", () => {
  assert.equal(rmsAmplitudeScale(0, 0.5), 1);
  assert.ok(rmsAmplitudeScale(1, 0.5) > 1.4);
  const exploded = rmsAmplitudeScale(0.7, 0.7, 0.55, 3.2);
  const calm = rmsAmplitudeScale(0.2, 0.7, 0.55, 3.2);
  assert.ok(exploded > calm * 2);
});

test("head-turn reflex and panic keywords trigger the extra layers", () => {
  assert.equal(shouldTriggerReflexBlink(1.2, 2.8), false);
  assert.equal(shouldTriggerReflexBlink(3.1, 2.8), true);
  assert.equal(shouldBoostSaccade("all good", "happy"), false);
  assert.equal(shouldBoostSaccade("wait I dropped it", "neutral"), true);
  assert.equal(shouldBoostSaccade("ok", "surprised"), true);
});
