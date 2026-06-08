import * as THREE from "three";
import type { VRM } from "@pixiv/three-vrm";
import type { VRMHumanBoneName } from "@pixiv/three-vrm-core";
import type { ArmTrackingState } from "@/lib/virtual-avatar/tracking/types";

const _target = new THREE.Vector3();
const _worldTarget = new THREE.Vector3();
const _boneWorld = new THREE.Vector3();
const _toEnd = new THREE.Vector3();
const _toTarget = new THREE.Vector3();
const _toEndDir = new THREE.Vector3();

function boneChain(vrm: VRM, side: "left" | "right"): THREE.Object3D[] {
  const p = side === "left" ? "left" : "right";
  const names = [`${p}UpperArm`, `${p}LowerArm`, `${p}Hand`] as VRMHumanBoneName[];
  return names.map((n) => vrm.humanoid?.getNormalizedBoneNode(n)).filter(Boolean) as THREE.Object3D[];
}

/** CCD IK — 손목 타깃 → 상완·하완·손 회전 */
export function solveArmCcd(
  vrm: VRM,
  side: "left" | "right",
  wx: number,
  wy: number,
  wz: number,
  iterations = 6,
  elbowPoleZ = 0
): ArmTrackingState | null {
  const chain = boneChain(vrm, side);
  if (chain.length < 3) return null;

  const root = chain[0].parent ?? vrm.scene;
  _worldTarget.set(wx, wy, wz);
  root.worldToLocal(_worldTarget);
  _target.copy(_worldTarget);

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = chain.length - 1; i >= 0; i--) {
      const bone = chain[i];
      bone.getWorldPosition(_boneWorld);
      root.worldToLocal(_boneWorld);

      chain[chain.length - 1].getWorldPosition(_toEnd);
      root.worldToLocal(_toEnd);

      _toTarget.copy(_target).sub(_boneWorld);
      _toEndDir.copy(_toEnd).sub(_boneWorld);
      if (_toTarget.lengthSq() < 1e-6 || _toEndDir.lengthSq() < 1e-6) continue;
      _toTarget.normalize();
      _toEndDir.normalize();

      const q = new THREE.Quaternion().setFromUnitVectors(_toEndDir, _toTarget);
      bone.quaternion.premultiply(q);
    }
  }

  const lower = chain[1].rotation;
  chain[1].rotation.z = THREE.MathUtils.lerp(chain[1].rotation.z, elbowPoleZ, 0.25);

  const upper = chain[0].rotation;
  const hand = chain[2].rotation;

  return {
    upper: { x: upper.x, y: upper.y, z: upper.z },
    lower: { x: lower.x, y: lower.y, z: lower.z },
    hand: { x: hand.x, y: hand.y, z: hand.z },
  };
}

/** 랜드마크 → VRM 로컬 손목 타깃 */
export function wristTargetFromLandmarks(wx: number, wy: number, wz: number, mirror: number) {
  return new THREE.Vector3((0.5 - wx) * mirror * 0.55, (0.5 - wy) * 0.65, -0.15 - wz * 0.35);
}
