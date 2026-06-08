import * as THREE from "three";
import type { VRM } from "@pixiv/three-vrm";
import type { VRMHumanBoneName } from "@pixiv/three-vrm-core";
import type { AvatarTrackingFrame } from "@/lib/virtual-avatar/tracking/types";

const SMOOTH = 0.22;

function lerpBone(node: THREE.Object3D, axis: "x" | "y" | "z", target: number) {
  node.rotation[axis] = THREE.MathUtils.lerp(node.rotation[axis], target, SMOOTH);
}

/** 발 바닥 고정 — 서 있을 때 발·발가락 평탄화 */
export function applyFootPlanting(vrm: VRM, frame: AvatarTrackingFrame) {
  const body = frame.body;
  if (!body.detected) return;

  const plant = (side: "left" | "right", legDetected: boolean) => {
    if (!legDetected) return;
    const p = side === "left" ? "left" : "right";
    const foot = vrm.humanoid?.getNormalizedBoneNode(`${p}Foot` as VRMHumanBoneName);
    const toes = vrm.humanoid?.getNormalizedBoneNode(`${p}Toes` as VRMHumanBoneName);
    if (foot) {
      lerpBone(foot, "x", 0);
      lerpBone(foot, "z", 0);
    }
    if (toes) lerpBone(toes, "x", 0);
  };

  plant("left", !!body.leftLeg);
  plant("right", !!body.rightLeg);

  const hips = vrm.humanoid?.getNormalizedBoneNode("hips");
  if (hips && body.pelvis) {
    lerpBone(hips, "x", body.pelvis.leanX * 0.12);
  }
}

/** 시선 IK — 고개·가슴이 카메라(정면) 쪽을 향하도록 미세 보정 */
export function applyLookAtCamera(vrm: VRM, frame: AvatarTrackingFrame) {
  if (!frame.detected || !frame.pose) return;

  const { yaw, pitch } = frame.pose;
  const chest = vrm.humanoid?.getNormalizedBoneNode("chest");
  const neck = vrm.humanoid?.getNormalizedBoneNode("neck");
  const head = vrm.humanoid?.getNormalizedBoneNode("head");

  const chestY = yaw * 0.08;
  const neckY = yaw * 0.12;
  const headY = yaw * 0.06;
  const headX = pitch * 0.08;

  if (chest) lerpBone(chest, "y", chestY);
  if (neck) {
    lerpBone(neck, "y", neckY);
    lerpBone(neck, "x", pitch * 0.06);
  }
  if (head) {
    lerpBone(head, "y", headY);
    lerpBone(head, "x", headX);
  }
}
