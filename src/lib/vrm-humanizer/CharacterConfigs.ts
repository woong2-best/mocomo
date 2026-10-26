import { resolveLiveAvatarId, type LiveAvatarId } from "@/lib/ai-live/avatars";
import type { FsmState } from "@/lib/vrm-humanizer/math";

export type { FsmState, LiveAvatarId };

export type EulerDeg = { x: number; y: number; z: number };

export type HabitName =
  | "hair_tuck"
  | "lip_touch"
  | "neck_crack"
  | "air_guitar_pick"
  | "wrist_shake"
  | "body_sway"
  | "check_phone";

export type CharacterConfig = {
  id: LiveAvatarId;
  posture: {
    hips: EulerDeg;
    spine: EulerDeg;
    chest: EulerDeg;
    neck: EulerDeg;
    leftShoulder: EulerDeg;
    rightShoulder: EulerDeg;
  };
  breathing: {
    speed: number;
    chestScaleMin: number;
    chestScaleMax: number;
    headPitchAmp: number;
  };
  microNoise: {
    spineAmp: number;
    neckAmp: number;
    headAmp: number;
  };
  weightShift: {
    intervalMinSec: number;
    intervalMaxSec: number;
    slerpSecMin: number;
    slerpSecMax: number;
    twistDegMin: number;
    twistDegMax: number;
    shoulderBobAmp: number;
  };
  saccade: {
    microHz: number;
    microAmp: number;
    macroIntervalMin: number;
    macroIntervalMax: number;
    macroChance: number;
    macroLeftDeg: number;
    macroRightDeg: number;
    thinkingPitchDeg: number;
    thinkingYawDeg: number;
    eyeContactHoldSec: number;
    avertSecMin: number;
    avertSecMax: number;
    blinkIntervalMin: number;
    blinkIntervalMax: number;
    thinkingBlinkScale: number;
  };
  rms: {
    tensionGain: number;
    explosionThreshold: number;
    explosionAmpMul: number;
    leanAmp: number;
  };
  habits: {
    hairTuckInterval?: [number, number];
    lipTouch: boolean;
    neckCrackInterval?: [number, number];
    airGuitar: boolean;
    wristShakeInterval?: [number, number];
    bodySwayAmp: number;
    checkPhoneSilenceSec: number;
    checkPhoneJoy: number;
  };
  clips: Partial<Record<FsmState | HabitName, string>>;
};

const ZERO: EulerDeg = Object.freeze({ x: 0, y: 0, z: 0 });

export const CHARACTER_CONFIGS: Record<LiveAvatarId, CharacterConfig> = {
  zelie: {
    id: "zelie",
    posture: {
      hips: ZERO,
      spine: ZERO,
      chest: ZERO,
      neck: ZERO,
      leftShoulder: ZERO,
      rightShoulder: ZERO,
    },
    breathing: { speed: 1.15, chestScaleMin: 1, chestScaleMax: 1.012, headPitchAmp: 0.012 },
    microNoise: { spineAmp: 0.004, neckAmp: 0.006, headAmp: 0.008 },
    weightShift: {
      intervalMinSec: 30,
      intervalMaxSec: 60,
      slerpSecMin: 2,
      slerpSecMax: 3,
      twistDegMin: 1,
      twistDegMax: 2,
      shoulderBobAmp: 0.035,
    },
    saccade: {
      microHz: 2.4,
      microAmp: 0.012,
      macroIntervalMin: 4,
      macroIntervalMax: 6,
      macroChance: 0.08,
      macroLeftDeg: 12,
      macroRightDeg: 14,
      thinkingPitchDeg: 28,
      thinkingYawDeg: 12,
      eyeContactHoldSec: 5.5,
      avertSecMin: 0.45,
      avertSecMax: 0.8,
      blinkIntervalMin: 2.4,
      blinkIntervalMax: 4.2,
      thinkingBlinkScale: 0.32,
    },
    rms: { tensionGain: 0.45, explosionThreshold: 1, explosionAmpMul: 1, leanAmp: 0.012 },
    habits: {
      hairTuckInterval: [45, 90],
      lipTouch: true,
      airGuitar: false,
      bodySwayAmp: 0.008,
      checkPhoneSilenceSec: 0,
      checkPhoneJoy: 0,
    },
    clips: {
      idle: "idle",
      thinking: "thinking",
      speaking: "speaking",
      hair_tuck: "hair_tuck",
      lip_touch: "lip_touch",
    },
  },
  cleo: {
    id: "cleo",
    posture: {
      hips: { x: 0.4, y: 2.5, z: 1.4 },
      spine: { x: 0, y: -0.6, z: -1.6 },
      chest: { x: 0, y: 0, z: 0.8 },
      neck: { x: 0, y: 0.4, z: 0 },
      leftShoulder: { x: 0, y: 0, z: 4.2 },
      rightShoulder: { x: 0, y: 0, z: -1.8 },
    },
    breathing: { speed: 1.22, chestScaleMin: 1, chestScaleMax: 1.013, headPitchAmp: 0.01 },
    microNoise: { spineAmp: 0.005, neckAmp: 0.007, headAmp: 0.009 },
    weightShift: {
      intervalMinSec: 25,
      intervalMaxSec: 45,
      slerpSecMin: 2,
      slerpSecMax: 3,
      twistDegMin: 1.2,
      twistDegMax: 2.8,
      shoulderBobAmp: 0.05,
    },
    saccade: {
      microHz: 2.1,
      microAmp: 0.014,
      macroIntervalMin: 2.2,
      macroIntervalMax: 3.6,
      macroChance: 0.42,
      macroLeftDeg: 18,
      macroRightDeg: 22,
      thinkingPitchDeg: 22,
      thinkingYawDeg: 18,
      eyeContactHoldSec: 1.8,
      avertSecMin: 1.1,
      avertSecMax: 2.2,
      blinkIntervalMin: 2.8,
      blinkIntervalMax: 5,
      thinkingBlinkScale: 0.4,
    },
    rms: { tensionGain: 0.55, explosionThreshold: 1, explosionAmpMul: 1, leanAmp: 0.02 },
    habits: {
      neckCrackInterval: [60, 120],
      lipTouch: false,
      airGuitar: true,
      bodySwayAmp: 0.012,
      checkPhoneSilenceSec: 0,
      checkPhoneJoy: 0,
    },
    clips: {
      idle: "idle",
      thinking: "thinking",
      speaking: "speaking",
      neck_crack: "neck_crack",
      air_guitar_pick: "air_guitar_pick",
    },
  },
  mio: {
    id: "mio",
    posture: {
      hips: { x: 1.2, y: 0, z: 0 },
      spine: { x: 2.4, y: 0, z: 0 },
      chest: { x: 3.2, y: 0, z: 0 },
      neck: { x: 8.5, y: 0, z: 0 },
      leftShoulder: { x: 3.5, y: 4, z: -8 },
      rightShoulder: { x: 3.5, y: -4, z: 8 },
    },
    breathing: { speed: 1.05, chestScaleMin: 1, chestScaleMax: 1.01, headPitchAmp: 0.008 },
    microNoise: { spineAmp: 0.008, neckAmp: 0.01, headAmp: 0.012 },
    weightShift: {
      intervalMinSec: 35,
      intervalMaxSec: 55,
      slerpSecMin: 2.2,
      slerpSecMax: 3.2,
      twistDegMin: 1,
      twistDegMax: 2.2,
      shoulderBobAmp: 0.028,
    },
    saccade: {
      microHz: 2.6,
      microAmp: 0.016,
      macroIntervalMin: 1.6,
      macroIntervalMax: 2.8,
      macroChance: 0.28,
      macroLeftDeg: 16,
      macroRightDeg: 20,
      thinkingPitchDeg: 18,
      thinkingYawDeg: 20,
      eyeContactHoldSec: 1.4,
      avertSecMin: 1.6,
      avertSecMax: 2.6,
      blinkIntervalMin: 1.35,
      blinkIntervalMax: 2.5,
      thinkingBlinkScale: 0.28,
    },
    rms: { tensionGain: 0.7, explosionThreshold: 0.55, explosionAmpMul: 3.2, leanAmp: 0.09 },
    habits: {
      wristShakeInterval: [18, 38],
      lipTouch: false,
      airGuitar: false,
      bodySwayAmp: 0.006,
      checkPhoneSilenceSec: 0,
      checkPhoneJoy: 0,
    },
    clips: {
      idle: "idle",
      thinking: "thinking",
      speaking: "speaking",
      wrist_shake: "wrist_shake",
    },
  },
  nangnang: {
    id: "nangnang",
    posture: {
      hips: { x: 0, y: 0.8, z: 0 },
      spine: { x: -0.6, y: 0, z: 0 },
      chest: { x: 0, y: 0, z: 0 },
      neck: { x: -0.8, y: 0, z: 0 },
      leftShoulder: ZERO,
      rightShoulder: ZERO,
    },
    breathing: { speed: 1.85, chestScaleMin: 1, chestScaleMax: 1.008, headPitchAmp: 0.018 },
    microNoise: { spineAmp: 0.01, neckAmp: 0.012, headAmp: 0.014 },
    weightShift: {
      intervalMinSec: 10,
      intervalMaxSec: 15,
      slerpSecMin: 1.4,
      slerpSecMax: 2.1,
      twistDegMin: 2,
      twistDegMax: 3.4,
      shoulderBobAmp: 0.06,
    },
    saccade: {
      microHz: 2.8,
      microAmp: 0.018,
      macroIntervalMin: 3,
      macroIntervalMax: 4.6,
      macroChance: 0.16,
      macroLeftDeg: 14,
      macroRightDeg: 16,
      thinkingPitchDeg: 26,
      thinkingYawDeg: 14,
      eyeContactHoldSec: 3.2,
      avertSecMin: 0.6,
      avertSecMax: 1.1,
      blinkIntervalMin: 1.8,
      blinkIntervalMax: 3.2,
      thinkingBlinkScale: 0.36,
    },
    rms: { tensionGain: 0.8, explosionThreshold: 1, explosionAmpMul: 1, leanAmp: 0.03 },
    habits: {
      lipTouch: false,
      airGuitar: false,
      bodySwayAmp: 0.038,
      checkPhoneSilenceSec: 15,
      checkPhoneJoy: 0.3,
    },
    clips: {
      idle: "idle",
      thinking: "thinking",
      speaking: "speaking",
      body_sway: "body_sway",
      check_phone: "check_phone",
    },
  },
};

export function resolveCharacterConfig(id: string | null | undefined): CharacterConfig {
  const resolved = resolveLiveAvatarId(id) ?? "zelie";
  return CHARACTER_CONFIGS[resolved];
}
