import * as THREE from "three";
import type { VRM } from "@pixiv/three-vrm";
import type { CharacterConfig } from "@/lib/vrm-humanizer/CharacterConfigs";
import {
  angularVelocity,
  clamp01,
  intervalFromUnit,
  rmsAmplitudeScale,
  shouldTriggerReflexBlink,
} from "@/lib/vrm-humanizer/math";
import { createContinuousNoise, type ContinuousNoise } from "@/lib/vrm-humanizer/noise";

const REFLEX_THRESHOLD = 2.8;
const BLINK_IN = 0.04;
const BLINK_HOLD = 0.05;
const BLINK_OUT = 0.08;
const BLINK_COOLDOWN = 0.55;

export type ReflexSample = {
  blink: number;
  amplitudeScale: number;
};

/**
 * Layer 5: head-turn blink reflex + RMS tension that scales Humanizer amplitude.
 */
export class ReflexController {
  private vrm: VRM | null = null;
  private config: CharacterConfig;
  private readonly noise: ContinuousNoise;
  private readonly prevHead = new THREE.Quaternion();
  private headReady = false;
  private rms = 0;
  private thinking = false;
  private reduced = false;
  private time = 0;
  private nextBlinkIn = 2.2;
  private blinkT = -1;
  private cooldown = 0;

  constructor(config: CharacterConfig, noise: ContinuousNoise = createContinuousNoise()) {
    this.config = config;
    this.noise = noise;
    this.scheduleBlink();
  }

  attach(vrm: VRM) {
    this.vrm = vrm;
    this.headReady = false;
  }

  setConfig(config: CharacterConfig) {
    this.config = config;
    this.scheduleBlink();
  }

  setRms(rms: number) {
    this.rms = clamp01(rms);
  }

  setThinking(thinking: boolean) {
    this.thinking = thinking;
  }

  setReducedMotion(reduced: boolean) {
    this.reduced = reduced;
  }

  amplitudeScale(): number {
    return rmsAmplitudeScale(
      this.rms,
      this.config.rms.tensionGain,
      this.config.rms.explosionThreshold,
      this.config.rms.explosionAmpMul
    );
  }

  update(delta: number): ReflexSample {
    const dt = Math.min(Math.max(delta, 0), 0.08);
    this.time += dt;
    if (this.cooldown > 0) this.cooldown -= dt;
    this.sampleHead(dt);
    this.tickPeriodic(dt);
    return {
      blink: this.blinkWeight(dt),
      amplitudeScale: this.amplitudeScale(),
    };
  }

  dispose() {
    this.vrm = null;
    this.headReady = false;
  }

  private headBone(): THREE.Object3D | null {
    return this.vrm?.humanoid?.getNormalizedBoneNode("head") ?? this.vrm?.humanoid?.getRawBoneNode("head") ?? null;
  }

  private sampleHead(dt: number) {
    const head = this.headBone();
    if (!head) return;
    if (!this.headReady) {
      this.prevHead.copy(head.quaternion);
      this.headReady = true;
      return;
    }
    const velocity = angularVelocity(this.prevHead.angleTo(head.quaternion), dt);
    this.prevHead.copy(head.quaternion);
    if (!this.reduced && this.cooldown <= 0 && shouldTriggerReflexBlink(velocity, REFLEX_THRESHOLD)) {
      this.triggerBlink();
    }
  }

  private tickPeriodic(dt: number) {
    if (this.blinkT >= 0) return;
    const scale = this.thinking ? this.config.saccade.thinkingBlinkScale : 1;
    this.nextBlinkIn -= dt * (this.reduced ? 0.45 : 1) * scale;
    if (this.nextBlinkIn <= 0) this.triggerBlink();
  }

  private triggerBlink() {
    this.blinkT = 0;
    this.cooldown = BLINK_COOLDOWN;
    this.scheduleBlink();
  }

  private scheduleBlink() {
    const cfg = this.config.saccade;
    this.nextBlinkIn = intervalFromUnit(this.noise.unit(this.time + 3, 61), cfg.blinkIntervalMin, cfg.blinkIntervalMax);
  }

  private blinkWeight(dt: number): number {
    if (this.blinkT < 0) return 0;
    this.blinkT += dt;
    const t = this.blinkT;
    if (t < BLINK_IN) return clamp01(t / BLINK_IN);
    if (t < BLINK_IN + BLINK_HOLD) return 1;
    const out = t - BLINK_IN - BLINK_HOLD;
    if (out >= BLINK_OUT) {
      this.blinkT = -1;
      return 0;
    }
    return clamp01(1 - out / BLINK_OUT);
  }
}
