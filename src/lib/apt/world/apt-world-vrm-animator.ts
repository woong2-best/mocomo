"use client";

import * as THREE from "three";
import type { VRM } from "@pixiv/three-vrm";
import type { VRMHumanBoneName } from "@pixiv/three-vrm-core";
import type { WorldAvatarAction } from "./world-avatar-types";

function setBone(
  vrm: VRM,
  bone: VRMHumanBoneName,
  x: number,
  y: number,
  z: number,
  lerp = 0.2
) {
  const n = vrm.humanoid?.getNormalizedBoneNode(bone);
  if (!n) return;
  n.rotation.x = THREE.MathUtils.lerp(n.rotation.x, x, lerp);
  n.rotation.y = THREE.MathUtils.lerp(n.rotation.y, y, lerp);
  n.rotation.z = THREE.MathUtils.lerp(n.rotation.z, z, lerp);
}

function resetBones(vrm: VRM) {
  const bones: VRMHumanBoneName[] = [
    "hips",
    "spine",
    "chest",
    "upperChest",
    "neck",
    "head",
    "leftUpperArm",
    "leftLowerArm",
    "leftHand",
    "rightUpperArm",
    "rightLowerArm",
    "rightHand",
    "leftUpperLeg",
    "rightUpperLeg",
    "leftLowerLeg",
    "rightLowerLeg",
    "leftFoot",
    "rightFoot",
  ];
  for (const b of bones) {
    const n = vrm.humanoid?.getNormalizedBoneNode(b);
    if (n) n.rotation.set(0, 0, 0);
  }
}

/** APT 월드 — VRM 복도·엘리베이터·문 procedural 애니 */
export class AptWorldVrmAnimator {
  private phase = 0;
  private action: WorldAvatarAction = "stand";
  private actionTime = 0;

  setAction(action: WorldAvatarAction) {
    if (this.action !== action) {
      this.action = action;
      this.actionTime = 0;
    }
  }

  tick(vrm: VRM, dt: number, moving: boolean) {
    this.phase += dt;
    this.actionTime += dt;
    const t = this.phase;
    const at = this.actionTime;

    if (moving && (this.action === "stand" || this.action === "walk")) {
      this.action = "walk";
      setBone(vrm, "leftUpperLeg", 0, 0, Math.sin(t * 8) * 0.42);
      setBone(vrm, "rightUpperLeg", 0, 0, -Math.sin(t * 8) * 0.42);
      setBone(vrm, "leftLowerLeg", 0, 0, Math.max(0, Math.sin(t * 8)) * 0.55);
      setBone(vrm, "rightLowerLeg", 0, 0, Math.max(0, -Math.sin(t * 8)) * 0.55);
      setBone(vrm, "leftUpperArm", 0, 0, -Math.sin(t * 8) * 0.35);
      setBone(vrm, "rightUpperArm", 0, 0, Math.sin(t * 8) * 0.35);
      setBone(vrm, "hips", 0, Math.sin(t * 8) * 0.04, 0);
      return;
    }

    switch (this.action) {
      case "knock": {
        const pulse = Math.sin(at * 14) * 0.5 + 0.5;
        setBone(vrm, "rightUpperArm", 0.8 * pulse, 0, -0.4, 0.35);
        setBone(vrm, "rightLowerArm", 1.1 * pulse, 0, 0, 0.35);
        setBone(vrm, "spine", 0.08 * pulse, 0, 0);
        setBone(vrm, "head", 0.05 * pulse, 0, 0);
        break;
      }
      case "bell": {
        const press = Math.sin(at * 10) * 0.5 + 0.5;
        setBone(vrm, "rightUpperArm", -1.4, 0, -0.2);
        setBone(vrm, "rightLowerArm", -0.3 - press * 0.4, 0, 0, 0.3);
        setBone(vrm, "rightHand", -0.2, 0, 0, 0.3);
        break;
      }
      case "door_open": {
        const push = Math.min(1, at * 2.5);
        setBone(vrm, "rightUpperArm", 0.3, 0, -0.9 * push);
        setBone(vrm, "rightLowerArm", 0.5, 0, -0.3 * push);
        setBone(vrm, "leftUpperArm", 0.2, 0, 0.5 * push);
        setBone(vrm, "spine", 0.05 * push, 0, 0);
        break;
      }
      case "elevator_idle": {
        setBone(vrm, "leftUpperArm", 0.15, 0, 0.25);
        setBone(vrm, "rightUpperArm", 0.15, 0, -0.25);
        setBone(vrm, "spine", Math.sin(t * 1.2) * 0.015, 0, 0);
        setBone(vrm, "hips", 0, Math.sin(t * 0.8) * 0.02, 0);
        break;
      }
      case "elevator_ride": {
        const sway = Math.sin(t * 3.5) * 0.04;
        const bump = Math.sin(t * 9) * 0.02;
        setBone(vrm, "hips", bump, sway, 0);
        setBone(vrm, "spine", -0.04 + bump, -sway * 0.5, 0);
        setBone(vrm, "leftUpperArm", 0.1, 0, 0.2);
        setBone(vrm, "rightUpperArm", 0.1, 0, -0.2);
        break;
      }
      case "wave":
        setBone(vrm, "rightUpperArm", 0.2, 0, -1.2 + Math.sin(t * 5) * 0.45);
        setBone(vrm, "rightLowerArm", 0, 0, -0.5);
        break;
      default:
        resetBones(vrm);
        setBone(vrm, "spine", Math.sin(t * 1.4) * 0.012, 0, 0, 0.08);
    }
  }

  reset(vrm: VRM) {
    resetBones(vrm);
  }
}
