import * as THREE from "three";
import type { VRM } from "@pixiv/three-vrm";
import type { VRMHumanBoneName } from "@pixiv/three-vrm-core";
import type { CharacterConfig, HabitName } from "@/lib/vrm-humanizer/CharacterConfigs";
import type { FsmState } from "@/lib/vrm-humanizer/math";
import {
  breathingHeadPitch,
  breathingScale,
  cartoonSlerpAlpha,
  clamp01,
  degToRad,
  intervalFromUnit,
  lerp,
  toonBopOffset,
  toonNodPitch,
  toonSquashScale,
  toonSwayRoll,
} from "@/lib/vrm-humanizer/math";
import { createContinuousNoise, type ContinuousNoise } from "@/lib/vrm-humanizer/noise";

type BoneName = VRMHumanBoneName;

type BoneCopy = {
  node: THREE.Object3D;
  rest: THREE.Quaternion;
  restScale: THREE.Vector3;
  restPos: THREE.Vector3;
};

type TrackedBone = {
  copies: BoneCopy[];
};

const BODY_BONES = [
  "hips",
  "spine",
  "chest",
  "upperChest",
  "neck",
  "head",
  "leftShoulder",
  "rightShoulder",
] as const satisfies readonly BoneName[];

const ARM_BONES = [
  "leftUpperArm",
  "leftLowerArm",
  "leftHand",
  "rightUpperArm",
  "rightLowerArm",
  "rightHand",
] as const satisfies readonly BoneName[];

function findBones(vrm: VRM, name: BoneName): THREE.Object3D[] {
  const normalized = vrm.humanoid?.getNormalizedBoneNode(name) ?? null;
  const raw = vrm.humanoid?.getRawBoneNode(name) ?? null;
  const nodes: THREE.Object3D[] = [];
  if (normalized) nodes.push(normalized);
  if (raw && raw !== normalized) nodes.push(raw);
  return nodes;
}

/**
 * Layers 2–3 plus character habits: posture, weight-shift slerp, breathing, and
 * Simplex micro-motion applied additively on top of the mixer pose.
 */
export class VRMHumanizer {
  private vrm: VRM | null = null;
  private config: CharacterConfig;
  private readonly noise: ContinuousNoise;
  private readonly body = new Map<BoneName, TrackedBone>();
  private readonly arms = new Map<BoneName, TrackedBone>();
  private readonly qPosture = new THREE.Quaternion();
  private readonly qShift = new THREE.Quaternion();
  private readonly qMicro = new THREE.Quaternion();
  private readonly qScratch = new THREE.Quaternion();
  private readonly eMicro = new THREE.Euler(0, 0, 0, "XYZ");
  private readonly ePosture = new THREE.Euler(0, 0, 0, "XYZ");
  private readonly eShift = new THREE.Euler(0, 0, 0, "XYZ");
  private shiftFrom = new THREE.Quaternion();
  private shiftTo = new THREE.Quaternion();
  private shiftElapsed = 0;
  private shiftDuration = 2.4;
  private nextShiftIn = 12;
  private time = 0;
  private amplitude = 1;
  private rms = 0;
  private state: FsmState = "idle";
  private reduced = false;
  private silence = 0;
  private habit: { name: HabitName; t: number; dur: number } | null = null;
  private nextHairTuck = 60;
  private nextNeckCrack = 90;
  private nextWristShake = 25;
  private pendingHabit: HabitName | null = null;
  private checkingPhone = false;
  private snapElapsed = 1;

  constructor(config: CharacterConfig, noise: ContinuousNoise = createContinuousNoise()) {
    this.config = config;
    this.noise = noise;
    this.resetTimers();
  }

  attach(vrm: VRM) {
    this.vrm = vrm;
    this.body.clear();
    this.arms.clear();
    for (const name of BODY_BONES) this.capture(this.body, name);
    for (const name of ARM_BONES) this.capture(this.arms, name);
    this.resetTimers();
  }

  setConfig(config: CharacterConfig) {
    this.config = config;
    this.resetTimers();
  }

  setAmplitudeScale(scale: number) {
    this.amplitude = Math.max(0, scale);
  }

  setRms(rms: number) {
    this.rms = rms;
  }

  setState(state: FsmState) {
    if (this.state === state) return;
    this.state = state;
    this.snapElapsed = 0;
    if (state !== "idle") this.checkingPhone = false;
    if (state === "thinking" && this.config.habits.lipTouch) {
      this.pendingHabit = "lip_touch";
    }
    if (state !== "thinking" && this.habit?.name === "lip_touch") {
      this.habit = null;
    }
  }

  setReducedMotion(reduced: boolean) {
    this.reduced = reduced;
  }

  consumeHabitTrigger(): HabitName | null {
    const next = this.pendingHabit;
    this.pendingHabit = null;
    return next;
  }

  startHabit(name: HabitName) {
    const dur =
      name === "neck_crack" ? 1.15 : name === "wrist_shake" ? 0.7 : name === "lip_touch" ? 99 : 1.85;
    this.habit = { name, t: 0, dur };
  }

  isCheckingPhone(): boolean {
    return this.checkingPhone;
  }

  checkPhoneJoy(): number {
    return this.checkingPhone ? this.config.habits.checkPhoneJoy : 0;
  }

  /** Body layer (posture, weight, breath, noise). Call before `vrm.update`. */
  update(delta: number) {
    const dt = Math.min(Math.max(delta, 0), 0.08);
    this.time += dt;
    if (this.state === "speaking") this.silence = 0;
    else this.silence += dt;
    this.tickHabits(dt);
    this.tickWeightShift(dt);
    if (!this.vrm) return;
    this.applyBody();
    this.applyToonBounciness(dt, this.rms, this.state);
  }

  /**
   * Last additive layer. Animal Crossing bop / nod / sway / squash.
   * Does not replace posture, breath, or noise — only offsets the finished pose.
   */
  applyToonBounciness(delta: number, audioRMS: number, currentState: FsmState) {
    const dt = Math.min(Math.max(delta, 0), 0.08);
    this.snapElapsed += dt;
    const head = this.body.get("head");
    const hips = this.body.get("hips");
    if (head) for (const copy of head.copies) copy.node.scale.copy(copy.restScale);
    if (hips) for (const copy of hips.copies) copy.node.position.copy(copy.restPos);

    const toon = this.config.toon;
    const mute = this.reduced ? 0.55 : 1;
    const rms = clamp01(audioRMS);
    const speakMix =
      currentState === "speaking" ? clamp01(0.28 + rms * 0.72) : currentState === "thinking" ? 0.12 : 0;
    const speed = lerp(toon.bopSpeedIdle, toon.bopSpeedSpeak, speakMix);
    const amp = lerp(toon.bopAmpIdle, toon.bopAmpSpeak, speakMix) * mute;
    const offset = toonBopOffset(this.time, speed, amp, toon.bopPhase);
    const wave = amp > 1e-8 ? offset / amp : 0;
    const snap = Math.exp(-this.snapElapsed * 7.2) * Math.sin(this.snapElapsed * 17) * toon.snapAmp * amp;

    if (hips) {
      for (const copy of hips.copies) copy.node.position.y = copy.restPos.y + offset + snap;
    }

    this.addLocalRot("head", toonNodPitch(wave, toon.nodAmp * (0.4 + speakMix * 0.6) * mute), 0, 0);
    const sway = toonSwayRoll(this.time, toon.swaySpeed, toon.swayAmp) * (0.65 + speakMix * 0.55) * mute;
    if (toon.swayAmp > 0) {
      this.addLocalRot("spine", 0, 0, sway);
      this.addLocalRot("chest", 0, 0, sway * 0.72);
    }

    if (head && currentState === "speaking" && toon.squash > 0) {
      const squash = toonSquashScale(wave, rms, toon.squash);
      for (const copy of head.copies) {
        copy.node.scale.set(copy.restScale.x * squash.x, copy.restScale.y * squash.y, copy.restScale.z);
      }
    }
  }

  /** Arm / hand layer. Call after hung-arm restore so habits win. */
  updateHands(delta: number) {
    if (!this.vrm) return;
    const dt = Math.min(Math.max(delta, 0), 0.08);
    if (this.habit) {
      this.habit.t += dt;
      if (this.habit.name !== "lip_touch" && this.habit.t >= this.habit.dur) this.habit = null;
    }
    this.applyHands();
  }

  dispose() {
    this.vrm = null;
    this.body.clear();
    this.arms.clear();
  }

  private capture(map: Map<BoneName, TrackedBone>, name: BoneName) {
    if (!this.vrm) return;
    const nodes = findBones(this.vrm, name);
    if (nodes.length === 0) return;
    map.set(name, {
      copies: nodes.map((node) => ({
        node,
        rest: node.quaternion.clone(),
        restScale: node.scale.clone(),
        restPos: node.position.clone(),
      })),
    });
  }

  private resetTimers() {
    const n = this.noise;
    const t = this.time + 1;
    const shift = this.config.weightShift;
    this.nextShiftIn = intervalFromUnit(n.unit(t, 11), shift.intervalMinSec, shift.intervalMaxSec);
    this.shiftFrom.identity();
    this.shiftTo.identity();
    this.shiftElapsed = this.shiftDuration;
    const hair = this.config.habits.hairTuckInterval;
    this.nextHairTuck = hair ? intervalFromUnit(n.unit(t, 12), hair[0], hair[1]) : Number.POSITIVE_INFINITY;
    const crack = this.config.habits.neckCrackInterval;
    this.nextNeckCrack = crack ? intervalFromUnit(n.unit(t, 13), crack[0], crack[1]) : Number.POSITIVE_INFINITY;
    const wrist = this.config.habits.wristShakeInterval;
    this.nextWristShake = wrist ? intervalFromUnit(n.unit(t, 14), wrist[0], wrist[1]) : Number.POSITIVE_INFINITY;
  }

  private tickHabits(dt: number) {
    if (this.reduced) return;
    if (this.state === "speaking" && this.config.habits.hairTuckInterval) {
      this.nextHairTuck -= dt;
      if (this.nextHairTuck <= 0 && !this.habit) {
        this.pendingHabit = "hair_tuck";
        this.nextHairTuck = intervalFromUnit(
          this.noise.unit(this.time, 21),
          this.config.habits.hairTuckInterval[0],
          this.config.habits.hairTuckInterval[1]
        );
      }
    }
    if (this.state === "idle" && this.config.habits.neckCrackInterval) {
      this.nextNeckCrack -= dt;
      if (this.nextNeckCrack <= 0 && !this.habit) {
        this.pendingHabit = "neck_crack";
        this.nextNeckCrack = intervalFromUnit(
          this.noise.unit(this.time, 22),
          this.config.habits.neckCrackInterval[0],
          this.config.habits.neckCrackInterval[1]
        );
      }
    }
    if (this.state !== "speaking" && this.config.habits.wristShakeInterval) {
      this.nextWristShake -= dt;
      if (this.nextWristShake <= 0 && !this.habit) {
        this.pendingHabit = "wrist_shake";
        this.nextWristShake = intervalFromUnit(
          this.noise.unit(this.time, 23),
          this.config.habits.wristShakeInterval[0],
          this.config.habits.wristShakeInterval[1]
        );
      }
    }
    const phoneAfter = this.config.habits.checkPhoneSilenceSec;
    this.checkingPhone = phoneAfter > 0 && this.state === "idle" && this.silence >= phoneAfter;
  }

  private tickWeightShift(dt: number) {
    if (this.reduced) return;
    if (this.shiftElapsed < this.shiftDuration) {
      this.shiftElapsed += dt;
      return;
    }
    this.nextShiftIn -= dt;
    if (this.nextShiftIn > 0) return;
    const cfg = this.config.weightShift;
    const unit = this.noise.unit(this.time, 31);
    const twist = degToRad(lerp(cfg.twistDegMin, cfg.twistDegMax, unit));
    const pitch = degToRad(lerp(1, cfg.twistDegMax, this.noise.unit(this.time, 32))) * 0.35;
    const side = this.noise.signed(this.time, 33) >= 0 ? 1 : -1;
    this.shiftFrom.copy(this.shiftTo);
    this.eShift.set(pitch * side * 0.4, twist * side, pitch * 0.25);
    this.shiftTo.setFromEuler(this.eShift);
    this.shiftDuration = intervalFromUnit(this.noise.unit(this.time, 34), cfg.slerpSecMin, cfg.slerpSecMax);
    this.shiftElapsed = 0;
    this.snapElapsed = 0;
    this.nextShiftIn = intervalFromUnit(this.noise.unit(this.time, 35), cfg.intervalMinSec, cfg.intervalMaxSec);
  }

  private applyBody() {
    const amp = this.reduced ? 0.15 : this.amplitude;
    const breath = this.config.breathing;
    const scale = this.reduced ? 1 : breathingScale(this.time, breath.speed, breath.chestScaleMin, breath.chestScaleMax);
    const nod = breathingHeadPitch(this.time, breath.speed, breath.headPitchAmp) * amp;
    const shiftAlpha = this.reduced ? 0 : cartoonSlerpAlpha(this.shiftElapsed, this.shiftDuration, this.config.toon.easing);
    this.qShift.slerpQuaternions(this.shiftFrom, this.shiftTo, shiftAlpha);
    const bob =
      !this.reduced && this.shiftElapsed < this.shiftDuration
        ? Math.sin(shiftAlpha * Math.PI) * this.config.weightShift.shoulderBobAmp
        : 0;
    const sway =
      this.state === "speaking" && !this.reduced
        ? Math.sin(this.time * 2.4) * this.config.habits.bodySwayAmp * amp
        : 0;
    const explode = this.rms >= this.config.rms.explosionThreshold ? this.rms : 0;
    const lean = explode * this.config.rms.leanAmp * amp;

    this.compose("hips", this.config.posture.hips, this.qShift, 0, 0, 0, 0);
    this.compose("spine", this.config.posture.spine, this.qShift, lean * 0.45, sway, this.noiseAt("spine", amp), nod * 0.15);
    this.compose("chest", this.config.posture.chest, this.qShift, lean, sway * 0.7, this.noiseAt("chest", amp), nod * 0.25);
    this.compose("upperChest", this.config.posture.chest, this.qIdentity(), lean * 0.5, sway * 0.4, this.noiseAt("chest", amp) * 0.6, 0);
    const phonePitch = this.checkingPhone ? 0.38 : 0;
    const crack = this.habit?.name === "neck_crack" ? this.neckCrackEuler() : { x: 0, y: 0, z: 0 };
    this.compose(
      "neck",
      this.config.posture.neck,
      this.qIdentity(),
      phonePitch * 0.45 + crack.x + nod * 0.55,
      crack.y,
      this.noiseAt("neck", amp) + crack.z,
      0
    );
    this.compose(
      "head",
      { x: 0, y: 0, z: 0 },
      this.qIdentity(),
      phonePitch + crack.x * 0.35 + nod,
      crack.y * 0.45,
      this.noiseAt("head", amp),
      0
    );
    this.compose("leftShoulder", this.config.posture.leftShoulder, this.qIdentity(), -bob, 0, 0, 0);
    this.compose("rightShoulder", this.config.posture.rightShoulder, this.qIdentity(), bob, 0, 0, 0);
    this.applyChestScale(scale);
  }

  private qIdentity(): THREE.Quaternion {
    return this.qScratch.identity();
  }

  private noiseAt(bone: "spine" | "chest" | "neck" | "head", amp: number): number {
    if (this.reduced) return 0;
    const channel = bone === "spine" ? 1 : bone === "chest" ? 2 : bone === "neck" ? 3 : 4;
    const base =
      bone === "head"
        ? this.config.microNoise.headAmp
        : bone === "neck"
          ? this.config.microNoise.neckAmp
          : this.config.microNoise.spineAmp;
    return this.noise.signed(this.time * 0.85, channel) * base * amp;
  }

  private compose(
    name: BoneName,
    postureDeg: { x: number; y: number; z: number },
    shift: THREE.Quaternion,
    extraX: number,
    extraY: number,
    extraZ: number,
    extraPitch: number
  ) {
    const tracked = this.body.get(name);
    if (!tracked) return;
    this.ePosture.set(degToRad(postureDeg.x), degToRad(postureDeg.y), degToRad(postureDeg.z));
    this.qPosture.setFromEuler(this.ePosture);
    this.eMicro.set(extraX + extraPitch, extraY, extraZ);
    this.qMicro.setFromEuler(this.eMicro);
    for (const copy of tracked.copies) {
      copy.node.quaternion.copy(copy.rest).multiply(this.qPosture).multiply(shift).multiply(this.qMicro);
    }
  }

  private applyChestScale(scale: number) {
    const chest = this.body.get("chest") ?? this.body.get("upperChest");
    if (!chest) return;
    for (const copy of chest.copies) {
      copy.node.scale.set(copy.restScale.x, copy.restScale.y * scale, copy.restScale.z * scale);
    }
  }

  private neckCrackEuler(): { x: number; y: number; z: number } {
    if (!this.habit) return { x: 0, y: 0, z: 0 };
    const u = this.habit.t / this.habit.dur;
    let yaw = 0;
    if (u < 0.28) yaw = lerp(0, -0.55, u / 0.28);
    else if (u < 0.62) yaw = lerp(-0.55, 0.58, (u - 0.28) / 0.34);
    else yaw = lerp(0.58, 0, (u - 0.62) / 0.38);
    return { x: 0.04, y: yaw, z: yaw * 0.15 };
  }

  private applyHands() {
    this.resetArm("leftUpperArm");
    this.resetArm("leftLowerArm");
    this.resetArm("leftHand");
    this.resetArm("rightUpperArm");
    this.resetArm("rightLowerArm");
    this.resetArm("rightHand");

    if (this.config.habits.airGuitar) this.applyAirGuitar();

    const habit = this.habit;
    if (!habit) return;
    const u = Math.min(habit.t / Math.max(habit.dur, 0.001), 1);
    if (habit.name === "hair_tuck") this.applyHairTuck(this.habitEnvelope(u));
    if (habit.name === "lip_touch") this.applyLipTouch(this.state === "thinking" ? 1 : 0);
    if (habit.name === "wrist_shake") this.applyWristShake(this.habitEnvelope(u));
  }

  private habitEnvelope(u: number): number {
    if (u < 0.22) return u / 0.22;
    if (u > 0.72) return Math.max(0, 1 - (u - 0.72) / 0.28);
    return 1;
  }

  private resetArm(name: BoneName) {
    const tracked = this.arms.get(name);
    if (!tracked) return;
    for (const copy of tracked.copies) copy.node.quaternion.copy(copy.rest);
  }

  private addLocalRot(name: BoneName, x: number, y: number, z: number) {
    const tracked = this.body.get(name);
    if (!tracked || (Math.abs(x) < 1e-6 && Math.abs(y) < 1e-6 && Math.abs(z) < 1e-6)) return;
    this.eMicro.set(x, y, z);
    this.qMicro.setFromEuler(this.eMicro);
    for (const copy of tracked.copies) copy.node.quaternion.multiply(this.qMicro);
  }

  private addLocal(name: BoneName, x: number, y: number, z: number, weight: number) {
    const tracked = this.arms.get(name);
    if (!tracked || weight <= 1e-4) return;
    this.eMicro.set(x * weight, y * weight, z * weight);
    this.qMicro.setFromEuler(this.eMicro);
    for (const copy of tracked.copies) copy.node.quaternion.multiply(this.qMicro);
  }

  private applyHairTuck(w: number) {
    this.addLocal("leftUpperArm", -0.95, 0.55, 0.7, w);
    this.addLocal("leftLowerArm", -1.15, 0.15, 0.1, w);
    this.addLocal("leftHand", 0.15, 0.35, 0.2, w);
  }

  private applyLipTouch(w: number) {
    const eased = this.reduced ? 0 : w;
    this.addLocal("rightUpperArm", -0.7, -0.35, -0.55, eased);
    this.addLocal("rightLowerArm", -1.35, 0.1, 0, eased);
    this.addLocal("rightHand", 0.1, -0.25, 0.15, eased);
  }

  private applyWristShake(w: number) {
    const flicker = Math.sin(this.time * 28) * 0.45;
    this.addLocal("leftLowerArm", 0.08, flicker, 0.12, w);
    this.addLocal("leftHand", flicker * 0.8, 0.1, flicker, w);
  }

  private applyAirGuitar() {
    const pick = Math.sin(this.time * 7.4) * 0.09 * (this.state === "speaking" ? 1.25 : 0.7);
    this.addLocal("rightHand", pick, 0.02, pick * 0.4, 1);
    this.addLocal("rightLowerArm", pick * 0.25, 0, 0, 1);
  }
}
