import * as THREE from "three";
import type { VRM } from "@pixiv/three-vrm";
import type { VRMHumanBoneName } from "@pixiv/three-vrm-core";
import type {
  ArmTrackingState,
  AvatarTrackingFrame,
  FingerBends,
  HandTrackingState,
  LegTrackingState,
  PelvisTrackingState,
} from "@/lib/virtual-avatar/tracking/types";
import { solveArmCcd } from "@/lib/virtual-avatar/tracking/ccd-arm-ik";

const SMOOTH = 0.28;

function lerpBone(node: THREE.Object3D, axis: "x" | "y" | "z", target: number) {
  node.rotation[axis] = THREE.MathUtils.lerp(node.rotation[axis], target, SMOOTH);
}

function lerpPos(node: THREE.Object3D, axis: "x" | "y" | "z", target: number) {
  node.position[axis] = THREE.MathUtils.lerp(node.position[axis], target, SMOOTH);
}

function applyRot(vrm: VRM, bone: VRMHumanBoneName, rot: { x: number; y: number; z: number }) {
  const node = vrm.humanoid?.getNormalizedBoneNode(bone);
  if (!node) return;
  lerpBone(node, "x", rot.x);
  lerpBone(node, "y", rot.y);
  lerpBone(node, "z", rot.z);
}

function applyArm(vrm: VRM, side: "left" | "right", arm: ArmTrackingState) {
  if (arm.wristTarget) {
    solveArmCcd(
      vrm,
      side,
      arm.wristTarget.x,
      arm.wristTarget.y,
      arm.wristTarget.z,
      6,
      arm.elbowPoleZ ?? 0
    );
    return;
  }
  const p = side === "left" ? "left" : "right";
  applyRot(vrm, `${p}UpperArm` as VRMHumanBoneName, arm.upper);
  applyRot(vrm, `${p}LowerArm` as VRMHumanBoneName, arm.lower);
  applyRot(vrm, `${p}Hand` as VRMHumanBoneName, arm.hand);
}

function applyLeg(vrm: VRM, side: "left" | "right", leg: LegTrackingState) {
  const p = side === "left" ? "left" : "right";
  applyRot(vrm, `${p}UpperLeg` as VRMHumanBoneName, leg.upper);
  applyRot(vrm, `${p}LowerLeg` as VRMHumanBoneName, leg.lower);
  applyRot(vrm, `${p}Foot` as VRMHumanBoneName, leg.foot);
}

function applyPelvis(vrm: VRM, pelvis: PelvisTrackingState) {
  const hips = vrm.humanoid?.getNormalizedBoneNode("hips");
  if (!hips) return;
  lerpBone(hips, "y", pelvis.rotationY);
  lerpBone(hips, "x", pelvis.leanX * 0.35);
  lerpPos(hips, "x", pelvis.shiftX);
  lerpPos(hips, "y", pelvis.shiftY);
  lerpPos(hips, "z", pelvis.shiftZ);
}

function applyFingerChain(
  vrm: VRM,
  side: "left" | "right",
  finger: "Thumb" | "Index" | "Middle" | "Ring" | "Little",
  bends: FingerBends,
  hasMeta: boolean
) {
  const p = side === "left" ? "left" : "right";
  const curl = (i: number) => -bends[i] * 1.35;

  if (finger === "Thumb" && hasMeta) {
    applyRot(vrm, `${p}ThumbMetacarpal` as VRMHumanBoneName, { x: curl(0) * 0.6, y: 0, z: 0 });
    applyRot(vrm, `${p}ThumbProximal` as VRMHumanBoneName, { x: curl(1), y: 0, z: 0 });
    applyRot(vrm, `${p}ThumbDistal` as VRMHumanBoneName, { x: curl(2), y: 0, z: 0 });
    return;
  }

  const mid = finger === "Index" ? "Index" : finger === "Middle" ? "Middle" : finger === "Ring" ? "Ring" : "Little";
  applyRot(vrm, `${p}${mid}Proximal` as VRMHumanBoneName, { x: curl(0), y: 0, z: 0 });
  applyRot(vrm, `${p}${mid}Intermediate` as VRMHumanBoneName, { x: curl(1), y: 0, z: 0 });
  applyRot(vrm, `${p}${mid}Distal` as VRMHumanBoneName, { x: curl(2), y: 0, z: 0 });
}

function applyHand(vrm: VRM, side: "left" | "right", hand: HandTrackingState) {
  applyFingerChain(vrm, side, "Thumb", hand.thumb, true);
  applyFingerChain(vrm, side, "Index", hand.index, false);
  applyFingerChain(vrm, side, "Middle", hand.middle, false);
  applyFingerChain(vrm, side, "Ring", hand.ring, false);
  applyFingerChain(vrm, side, "Little", hand.little, false);
}

export function applyBodyTracking(vrm: VRM, frame: AvatarTrackingFrame) {
  const body = frame.body;
  if (!body.detected) return;

  if (body.pelvis) applyPelvis(vrm, body.pelvis);
  if (body.leftArm) applyArm(vrm, "left", body.leftArm);
  if (body.rightArm) applyArm(vrm, "right", body.rightArm);
  if (body.leftLeg) applyLeg(vrm, "left", body.leftLeg);
  if (body.rightLeg) applyLeg(vrm, "right", body.rightLeg);

  const lSh = vrm.humanoid?.getNormalizedBoneNode("leftShoulder");
  const rSh = vrm.humanoid?.getNormalizedBoneNode("rightShoulder");
  if (lSh) lerpBone(lSh, "z", body.leftShoulderRaise * 0.35);
  if (rSh) lerpBone(rSh, "z", -body.rightShoulderRaise * 0.35);

  const hands = frame.hands;
  if (hands.left?.detected) applyHand(vrm, "left", hands.left);
  if (hands.right?.detected) applyHand(vrm, "right", hands.right);
}

const ARM_BONES = [
  "leftShoulder",
  "rightShoulder",
  "leftUpperArm",
  "leftLowerArm",
  "leftHand",
  "rightUpperArm",
  "rightLowerArm",
  "rightHand",
] as const satisfies readonly VRMHumanBoneName[];

const LEG_BONES = [
  "leftUpperLeg",
  "leftLowerLeg",
  "leftFoot",
  "leftToes",
  "rightUpperLeg",
  "rightLowerLeg",
  "rightFoot",
  "rightToes",
] as const satisfies readonly VRMHumanBoneName[];

const FINGER_BONES = [
  "leftThumbMetacarpal",
  "leftThumbProximal",
  "leftThumbDistal",
  "leftIndexProximal",
  "leftIndexIntermediate",
  "leftIndexDistal",
  "leftMiddleProximal",
  "leftMiddleIntermediate",
  "leftMiddleDistal",
  "leftRingProximal",
  "leftRingIntermediate",
  "leftRingDistal",
  "leftLittleProximal",
  "leftLittleIntermediate",
  "leftLittleDistal",
  "rightThumbMetacarpal",
  "rightThumbProximal",
  "rightThumbDistal",
  "rightIndexProximal",
  "rightIndexIntermediate",
  "rightIndexDistal",
  "rightMiddleProximal",
  "rightMiddleIntermediate",
  "rightMiddleDistal",
  "rightRingProximal",
  "rightRingIntermediate",
  "rightRingDistal",
  "rightLittleProximal",
  "rightLittleIntermediate",
  "rightLittleDistal",
] as const satisfies readonly VRMHumanBoneName[];

export function resetBodyTracking(vrm: VRM) {
  const resetBone = (bone: VRMHumanBoneName) => {
    const node = vrm.humanoid?.getNormalizedBoneNode(bone);
    if (!node) return;
    node.rotation.x = THREE.MathUtils.lerp(node.rotation.x, 0, 0.18);
    node.rotation.y = THREE.MathUtils.lerp(node.rotation.y, 0, 0.18);
    node.rotation.z = THREE.MathUtils.lerp(node.rotation.z, 0, 0.18);
    node.position.x = THREE.MathUtils.lerp(node.position.x, 0, 0.18);
    node.position.y = THREE.MathUtils.lerp(node.position.y, 0, 0.18);
    node.position.z = THREE.MathUtils.lerp(node.position.z, 0, 0.18);
  };

  for (const bone of [...ARM_BONES, ...LEG_BONES, ...FINGER_BONES]) {
    resetBone(bone);
  }
  resetBone("hips");
}
