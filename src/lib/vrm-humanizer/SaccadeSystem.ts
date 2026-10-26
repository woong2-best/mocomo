import * as THREE from "three";
import type { VRM } from "@pixiv/three-vrm";
import type { CharacterConfig } from "@/lib/vrm-humanizer/CharacterConfigs";
import { damp, degToRad, intervalFromUnit } from "@/lib/vrm-humanizer/math";
import { createContinuousNoise, type ContinuousNoise } from "@/lib/vrm-humanizer/noise";

/**
 * Wraps `VRMLookAt` with micro-saccades, occasional glance-aways, and a
 * thinking gaze that lifts off the camera.
 */
export class SaccadeSystem {
  private vrm: VRM | null = null;
  private config: CharacterConfig;
  private readonly noise: ContinuousNoise;
  private readonly gaze = new THREE.Object3D();
  private readonly desired = new THREE.Vector3();
  private readonly headPos = new THREE.Vector3();
  private readonly camPos = new THREE.Vector3();
  private readonly dir = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);
  private readonly right = new THREE.Vector3();
  private readonly qYaw = new THREE.Quaternion();
  private readonly qPitch = new THREE.Quaternion();
  private thinking = false;
  private boost = 1;
  private boostUntil = 0;
  private time = 0;
  private nextMacroIn = 3.5;
  private macroLeft = 0;
  private avertIn = 2;
  private avertLeft = 0;
  private avertYaw = 0.2;
  private avertPitch = -0.25;
  private phone = false;
  private reduced = false;

  constructor(config: CharacterConfig, noise: ContinuousNoise = createContinuousNoise()) {
    this.config = config;
    this.noise = noise;
    this.gaze.name = "moco-saccade-target";
    this.resetTimers();
  }

  attach(vrm: VRM, parent: THREE.Object3D, camera?: THREE.Object3D) {
    this.vrm = vrm;
    if (!this.gaze.parent) parent.add(this.gaze);
    camera?.getWorldPosition(this.gaze.position);
    this.bindLookAt();
  }

  bindLookAt() {
    const lookAt = this.vrm?.lookAt;
    if (!lookAt) return;
    lookAt.autoUpdate = true;
    lookAt.target = this.gaze;
  }

  setConfig(config: CharacterConfig) {
    this.config = config;
    this.resetTimers();
  }

  setThinking(thinking: boolean) {
    this.thinking = thinking;
  }

  setCheckingPhone(phone: boolean) {
    this.phone = phone;
  }

  setReducedMotion(reduced: boolean) {
    this.reduced = reduced;
  }

  boostSaccade(multiplier: number, seconds = 2.4) {
    this.boost = Math.max(1, multiplier);
    this.boostUntil = this.time + seconds;
  }

  update(delta: number, camera: THREE.Object3D) {
    const dt = Math.min(Math.max(delta, 0), 0.08);
    this.time += dt;
    if (this.time >= this.boostUntil) this.boost = 1;
    this.tickMacro(dt);
    this.tickAvert(dt);
    if (!this.vrm) return;

    const head =
      this.vrm.humanoid?.getNormalizedBoneNode("head") ?? this.vrm.humanoid?.getRawBoneNode("head");
    if (head) head.getWorldPosition(this.headPos);
    else this.headPos.set(0, 1.4, 0);
    camera.getWorldPosition(this.camPos);

    this.dir.subVectors(this.camPos, this.headPos);
    if (this.dir.lengthSq() < 1e-8) this.dir.set(0, 0, 1);
    this.dir.normalize();

    let yaw = 0;
    let pitch = 0;
    const cfg = this.config.saccade;
    const amp = this.reduced ? 0.15 : this.boost;

    if (this.thinking) {
      const side = this.noise.signed(0.17, 41) >= 0 ? 1 : -1;
      yaw += degToRad(cfg.thinkingYawDeg) * side;
      pitch += degToRad(cfg.thinkingPitchDeg);
    }
    if (this.phone) {
      pitch -= 0.55;
      yaw += 0.08;
    }
    if (this.macroLeft > 0) {
      const side = this.noise.signed(Math.floor(this.time), 42) >= 0 ? -1 : 1;
      yaw += degToRad(side < 0 ? cfg.macroLeftDeg : cfg.macroRightDeg) * side;
    }
    if (this.avertLeft > 0 && !this.thinking) {
      yaw += this.avertYaw;
      pitch += this.avertPitch;
    }
    if (!this.reduced) {
      const microT = this.time * cfg.microHz;
      yaw += this.noise.signed(microT, 43) * cfg.microAmp * amp;
      pitch += this.noise.signed(microT + 8.1, 44) * cfg.microAmp * 0.7 * amp;
    }

    this.right.crossVectors(this.dir, this.up);
    if (this.right.lengthSq() < 1e-8) this.right.set(1, 0, 0);
    else this.right.normalize();
    this.qYaw.setFromAxisAngle(this.up, yaw);
    this.qPitch.setFromAxisAngle(this.right, pitch);
    this.dir.applyQuaternion(this.qYaw).applyQuaternion(this.qPitch).normalize();
    this.desired.copy(this.headPos).addScaledVector(this.dir, 2.2);

    const follow = this.thinking || this.phone ? 4.2 : 9;
    this.gaze.position.x = damp(this.gaze.position.x, this.desired.x, follow, dt);
    this.gaze.position.y = damp(this.gaze.position.y, this.desired.y, follow, dt);
    this.gaze.position.z = damp(this.gaze.position.z, this.desired.z, follow, dt);
    this.bindLookAt();
  }

  dispose() {
    this.gaze.removeFromParent();
    if (this.vrm?.lookAt) this.vrm.lookAt.target = undefined;
    this.vrm = null;
  }

  private resetTimers() {
    this.nextMacroIn = intervalFromUnit(this.noise.unit(1, 51), this.config.saccade.macroIntervalMin, this.config.saccade.macroIntervalMax);
    this.avertIn = this.config.saccade.eyeContactHoldSec;
  }

  private tickMacro(dt: number) {
    if (this.macroLeft > 0) {
      this.macroLeft -= dt;
      return;
    }
    if (this.reduced || this.thinking) return;
    this.nextMacroIn -= dt;
    if (this.nextMacroIn > 0) return;
    this.nextMacroIn = intervalFromUnit(
      this.noise.unit(this.time, 52),
      this.config.saccade.macroIntervalMin,
      this.config.saccade.macroIntervalMax
    );
    if (this.noise.unit(this.time, 53) <= this.config.saccade.macroChance) {
      this.macroLeft = 0.5;
    }
  }

  private tickAvert(dt: number) {
    if (this.thinking || this.phone || this.reduced) return;
    if (this.avertLeft > 0) {
      this.avertLeft -= dt;
      if (this.avertLeft <= 0) this.avertIn = this.config.saccade.eyeContactHoldSec;
      return;
    }
    this.avertIn -= dt;
    if (this.avertIn > 0) return;
    this.avertLeft = intervalFromUnit(
      this.noise.unit(this.time, 54),
      this.config.saccade.avertSecMin,
      this.config.saccade.avertSecMax
    );
    this.avertYaw = this.noise.signed(this.time, 55) * 0.35;
    this.avertPitch = this.noise.signed(this.time, 56) >= 0 ? -0.32 : -0.12;
  }
}
