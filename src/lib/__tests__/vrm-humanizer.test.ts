import test from "node:test";
import assert from "node:assert/strict";
import { CHARACTER_CONFIGS, resolveCharacterConfig } from "@/lib/vrm-humanizer/CharacterConfigs";
import {
  breathingScale,
  cartoonEase,
  cartoonSlerpAlpha,
  TOON_BOP_MAX,
  TOON_NOD_MAX,
  TOON_SWAY_MAX,
  resolveFsmState,
  rmsAmplitudeScale,
  shouldBoostSaccade,
  shouldTriggerReflexBlink,
  slerpAlpha,
  toonBopOffset,
  toonNodPitch,
  toonSquashScale,
  toonSwayRoll,
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

test("each avatar has a distinct Animal Crossing toon profile", () => {
  assert.ok(CHARACTER_CONFIGS.zelie.toon.swayAmp > 0);
  assert.ok(CHARACTER_CONFIGS.zelie.toon.bopAmpIdle < CHARACTER_CONFIGS.nangnang.toon.bopAmpIdle);
  assert.ok(CHARACTER_CONFIGS.zelie.toon.bopAmpIdle < 0.003);
  assert.ok(CHARACTER_CONFIGS.nangnang.toon.swayAmp <= TOON_SWAY_MAX);
  assert.ok(CHARACTER_CONFIGS.nangnang.toon.nodAmp <= TOON_NOD_MAX);
  assert.equal(CHARACTER_CONFIGS.cleo.toon.swayAmp, 0);
  assert.ok(CHARACTER_CONFIGS.cleo.toon.bopPhase > 1);
  assert.ok(CHARACTER_CONFIGS.mio.toon.bopSpeedIdle > CHARACTER_CONFIGS.zelie.toon.bopSpeedIdle * 2);
  assert.ok(CHARACTER_CONFIGS.nangnang.toon.bopAmpSpeak > CHARACTER_CONFIGS.zelie.toon.bopAmpSpeak);
  assert.ok(CHARACTER_CONFIGS.nangnang.toon.swayAmp > CHARACTER_CONFIGS.zelie.toon.swayAmp);
  assert.equal(CHARACTER_CONFIGS.zelie.toon.bopSpeedSpeak, CHARACTER_CONFIGS.zelie.toon.bopSpeedIdle * 2);
  assert.equal(CHARACTER_CONFIGS.zelie.toon.easing, "sine");
  assert.equal(CHARACTER_CONFIGS.nangnang.toon.easing, "sine");
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

test("cartoon easing uses a soft sine settle without overshoot", () => {
  assert.equal(cartoonEase(0, "sine"), 0);
  assert.equal(cartoonEase(1, "sine"), 1);
  assert.ok(cartoonEase(0.5, "sine") > 0.7 && cartoonEase(0.5, "sine") < 0.75);
  assert.ok(cartoonEase(0.45, "sine") < 1);
  assert.ok(cartoonSlerpAlpha(0.5, 1, "quad") > 0.7);
});

test("toon bop nods down when the hips drop and squashes at RMS peak", () => {
  const down = toonBopOffset(Math.PI / 2 / 2, 2, 0.02, 0);
  assert.equal(down, TOON_BOP_MAX);
  assert.ok(toonNodPitch(-1, 0.05) > 0);
  assert.ok(toonNodPitch(1, 0.05) < 0);
  assert.equal(toonNodPitch(-1, 2), TOON_NOD_MAX);
  assert.equal(toonSwayRoll(Math.PI / 2, 1, 2), TOON_SWAY_MAX);
  const squash = toonSquashScale(-1, 1, 1);
  assert.ok(Math.abs(squash.x - 1.02) < 1e-9);
  assert.ok(Math.abs(squash.y - 0.98) < 1e-9);
  const rest = toonSquashScale(1, 1, 1);
  assert.equal(rest.x, 1);
  assert.equal(rest.y, 1);
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
