import * as THREE from "three";
import type { VRM } from "@pixiv/three-vrm";
import type { VRMHumanBoneName } from "@pixiv/three-vrm-core";
import type { AvatarBodyParams } from "@/lib/virtual-avatar/types";

const MORPH_BONES = [
  "hips",
  "spine",
  "chest",
  "upperChest",
  "leftShoulder",
  "rightShoulder",
  "leftUpperArm",
  "leftLowerArm",
  "rightUpperArm",
  "rightLowerArm",
  "leftUpperLeg",
  "leftLowerLeg",
  "rightUpperLeg",
  "rightLowerLeg",
] as const satisfies readonly VRMHumanBoneName[];

type Vec3 = { x: number; y: number; z: number };
type MorphBone = (typeof MORPH_BONES)[number];
export type BodyMorphScales = Record<MorphBone, Vec3>;

function delta(value: number, baseline: number, span: number): number {
  return (value - baseline) / span;
}

const v = (x: number, y: number, z: number): Vec3 => ({ x, y, z });
const ONE = v(1, 1, 1);

/**
 * 슬라이더별 독립 채널.
 * 체중 → spine/chest/hips X·Z만. 팔·다리 Y는 해당 슬라이더만.
 * 부모 bulk 전달은 팔·다리 역스케일로 상쇄.
 */
export function computeBodyMorphScales(body: AvatarBodyParams): BodyMorphScales {
  const heightD = delta(body.height, 168, 40);
  const legD = delta(body.legLength, 90, 40);
  const weightD = delta(body.weight, 58, 30);
  const shoulderD = delta(body.shoulderWidth, 45, 15);
  const waistD = delta(body.waist, 68, 20);
  const armLengthD = delta(body.armLength, 60, 15);
  const armThicknessD = delta(body.armThickness, 60, 15);

  const genderX =
    body.genderExpression === "male" ? 1.03 : body.genderExpression === "female" ? 0.98 : 1;

  const spineY = 1 + heightD * 0.1;
  const upperChestY = 1 + heightD * 0.04;
  const thighY = 1 + heightD * 0.22;
  const calfY = 1 + heightD * 0.28;

  const thighYFinal = thighY + legD * 0.28;
  const calfYFinal = calfY + legD * 0.32;

  // 팔 길이: T-포즈 기준 팔 본 local X (양옆으로 뻗음)
  const upperArmLengthX = 1 + armLengthD * 0.28;
  const lowerArmLengthX = 1 + armLengthD * 0.32;
  // 팔 두께: 본 단면 Y·Z
  const armThickY = 1 + armThicknessD * 0.24;
  const armThickZ = 1 + armThicknessD * 0.2;

  const shoulderX = 1 + shoulderD * 0.14;
  const upperChestX = shoulderX * genderX;

  const waistX = 1 + waistD * 0.1;
  const waistZ = 1 + waistD * 0.08;

  const weightX = 1 + weightD * 0.1;
  const weightZ = 1 + weightD * 0.085;

  const spine = v(weightX, spineY, weightZ);
  const chest = v(weightX * genderX, 1, weightZ);
  const hips = v(waistX * weightX * genderX, 1, waistZ * weightZ);
  const upperChest = v(upperChestX, upperChestY, 1);

  const armCancelX = 1 / (spine.x * chest.x * upperChest.x * shoulderX);
  const armCancelZ = 1 / (spine.z * chest.z);

  const legCancelX = 1 / hips.x;
  const legCancelZ = 1 / hips.z;

  const upperArmScale = v(armCancelX * upperArmLengthX, armThickY, armThickZ * armCancelZ);
  const lowerArmScale = v(armCancelX * lowerArmLengthX, armThickY, armThickZ * armCancelZ);

  return {
    hips,
    spine,
    chest,
    upperChest,
    leftShoulder: v(shoulderX, 1, 1),
    rightShoulder: v(shoulderX, 1, 1),
    leftUpperArm: upperArmScale,
    leftLowerArm: lowerArmScale,
    rightUpperArm: upperArmScale,
    rightLowerArm: lowerArmScale,
    leftUpperLeg: v(legCancelX, thighYFinal, legCancelZ),
    leftLowerLeg: v(legCancelX, calfYFinal, legCancelZ),
    rightUpperLeg: v(legCancelX, thighYFinal, legCancelZ),
    rightLowerLeg: v(legCancelX, calfYFinal, legCancelZ),
  };
}

function setRawBoneScale(vrm: VRM, bone: VRMHumanBoneName, scale: Vec3) {
  const node = vrm.humanoid?.getRawBoneNode(bone);
  if (node) node.scale.set(scale.x, scale.y, scale.z);
}

function resetMorphBones(vrm: VRM) {
  for (const bone of MORPH_BONES) {
    setRawBoneScale(vrm, bone, ONE);
  }
}

export function applyBodyMorphToVrm(vrm: VRM, body: AvatarBodyParams) {
  vrm.scene.scale.set(1, 1, 1);
  resetMorphBones(vrm);

  const scales = computeBodyMorphScales(body);
  for (const bone of MORPH_BONES) {
    setRawBoneScale(vrm, bone, scales[bone]);
  }
}

export function compensateFeetToFloor(vrm: VRM, floorY: number): number {
  vrm.scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(vrm.scene);
  if (box.isEmpty()) return vrm.scene.position.y;
  const delta = floorY - box.min.y;
  if (Math.abs(delta) > 0.0005) {
    vrm.scene.position.y += delta;
  }
  return vrm.scene.position.y;
}

export function getLimbLengthScales(body: AvatarBodyParams) {
  const s = computeBodyMorphScales(body);
  return {
    upperArmX: s.leftUpperArm.x,
    lowerArmX: s.leftLowerArm.x,
    upperArmThicknessY: s.leftUpperArm.y,
    thighY: s.leftUpperLeg.y,
    calfY: s.leftLowerLeg.y,
  };
}
