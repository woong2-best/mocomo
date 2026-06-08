import * as THREE from "three";
import type { VRM } from "@pixiv/three-vrm";
import type { VRMHumanBoneName } from "@pixiv/three-vrm-core";
import type { AvatarTrackingFrame, FaceBlendShapeMap } from "@/lib/virtual-avatar/tracking/types";
import { applyArkitFaceMorphs } from "@/lib/virtual-avatar/tracking/arkit-morph-map";
import { applyBodyTracking, resetBodyTracking } from "@/lib/virtual-avatar/tracking/body-driver";
import { applyFootPlanting, applyLookAtCamera } from "@/lib/virtual-avatar/tracking/full-body-ik";
import { resetSpringPhysics } from "@/lib/virtual-avatar/tracking/spring-physics";

const SPINE_CHAIN = ["hips", "spine", "chest", "upperChest", "neck"] as const satisfies readonly VRMHumanBoneName[];

function clamp01(v: number): number {
  return THREE.MathUtils.clamp(v, 0, 1);
}

function lerpBone(node: THREE.Object3D, axis: "x" | "y" | "z", target: number, t: number) {
  node.rotation[axis] = THREE.MathUtils.lerp(node.rotation[axis], target, t);
}

function bs(shapes: FaceBlendShapeMap, name: string): number {
  return shapes[name] ?? 0;
}

function setExpression(em: NonNullable<VRM["expressionManager"]>, name: string, value: number) {
  if (em.getExpression(name)) {
    em.setValue(name, clamp01(value));
  }
}

/** 척추 연쇄 회전 — 허리→가슴→목→머리 순서로 yaw/pitch 분배 */
function applySpineCascade(
  vrm: VRM,
  yaw: number,
  pitch: number,
  roll: number,
  smooth: number
) {
  const weights = {
    hips: { y: 0.08, x: 0.05 },
    spine: { y: 0.14, x: 0.1 },
    chest: { y: 0.18, x: 0.14 },
    upperChest: { y: 0.12, x: 0.1 },
    neck: { y: 0.22, x: 0.2, z: 0.35 },
  } as const;

  for (const bone of SPINE_CHAIN) {
    const node = vrm.humanoid?.getNormalizedBoneNode(bone);
    const w = weights[bone as keyof typeof weights];
    if (!node || !w) continue;
    if ("y" in w) lerpBone(node, "y", yaw * w.y, smooth);
    if ("x" in w) lerpBone(node, "x", pitch * w.x, smooth);
    if ("z" in w) lerpBone(node, "z", roll * w.z, smooth);
  }
}

function applyHeadBone(vrm: VRM, yaw: number, pitch: number, roll: number, smooth: number) {
  const head = vrm.humanoid?.getNormalizedBoneNode("head");
  if (!head) return;
  lerpBone(head, "y", yaw * 0.38, smooth);
  lerpBone(head, "x", pitch * 0.42, smooth);
  lerpBone(head, "z", roll * 0.52, smooth);
}

/** 머리 위치 — 앞뒤·좌우·상하 이동 */
function applyHeadTranslation(vrm: VRM, tx: number, ty: number, tz: number, smooth: number) {
  const head = vrm.humanoid?.getNormalizedBoneNode("head");
  if (!head) return;
  head.position.x = THREE.MathUtils.lerp(head.position.x, tx * 0.045, smooth);
  head.position.y = THREE.MathUtils.lerp(head.position.y, ty * 0.035, smooth);
  head.position.z = THREE.MathUtils.lerp(head.position.z, tz * 0.055, smooth);
}

/** ARKit eyeLook* → 안구 normalized 본 회전 */
function applyEyeGaze(vrm: VRM, shapes: FaceBlendShapeMap, smooth: number) {
  const lookX =
    (bs(shapes, "eyeLookOutLeft") +
      bs(shapes, "eyeLookInRight") -
      bs(shapes, "eyeLookInLeft") -
      bs(shapes, "eyeLookOutRight")) *
    0.5;
  const lookY =
    (bs(shapes, "eyeLookUpLeft") +
      bs(shapes, "eyeLookUpRight") -
      bs(shapes, "eyeLookDownLeft") -
      bs(shapes, "eyeLookDownRight")) *
    0.5;

  const left = vrm.humanoid?.getNormalizedBoneNode("leftEye");
  const right = vrm.humanoid?.getNormalizedBoneNode("rightEye");
  if (left) {
    lerpBone(left, "y", lookX * 0.55, smooth);
    lerpBone(left, "x", -lookY * 0.45, smooth);
  }
  if (right) {
    lerpBone(right, "y", lookX * 0.55, smooth);
    lerpBone(right, "x", -lookY * 0.45, smooth);
  }
}

function applyVrmExpressions(vrm: VRM, frame: AvatarTrackingFrame) {
  const em = vrm.expressionManager;
  if (!em) return;

  const s = frame.blendShapes;
  const v = frame.visemes;

  setExpression(em, "blinkLeft", bs(s, "eyeBlinkLeft"));
  setExpression(em, "blinkRight", bs(s, "eyeBlinkRight"));
  setExpression(em, "blink", (bs(s, "eyeBlinkLeft") + bs(s, "eyeBlinkRight")) * 0.5);

  setExpression(em, "aa", v.aa);
  setExpression(em, "ih", v.ih);
  setExpression(em, "ou", v.ou);
  setExpression(em, "ee", v.ee);
  setExpression(em, "oh", v.oh);

  const smile = (bs(s, "mouthSmileLeft") + bs(s, "mouthSmileRight")) * 0.5;
  const frown = (bs(s, "mouthFrownLeft") + bs(s, "mouthFrownRight")) * 0.5;
  setExpression(em, "happy", smile * 0.92);
  setExpression(em, "sad", frown * 0.85);

  const browDown = (bs(s, "browDownLeft") + bs(s, "browDownRight")) * 0.5;
  const browUp =
    (bs(s, "browOuterUpLeft") +
      bs(s, "browOuterUpRight") +
      bs(s, "browInnerUp")) /
    3;
  setExpression(em, "angry", browDown * 0.75);
  setExpression(em, "surprised", browUp * 0.8);

  const squint = (bs(s, "eyeSquintLeft") + bs(s, "eyeSquintRight")) * 0.5;
  setExpression(em, "relaxed", squint * 0.4);

  const lookLeft =
    bs(s, "eyeLookOutLeft") + bs(s, "eyeLookInRight");
  const lookRight =
    bs(s, "eyeLookInLeft") + bs(s, "eyeLookOutRight");
  const lookUp = bs(s, "eyeLookUpLeft") + bs(s, "eyeLookUpRight");
  const lookDown = bs(s, "eyeLookDownLeft") + bs(s, "eyeLookDownRight");

  setExpression(em, "lookLeft", clamp01(lookLeft * 0.55));
  setExpression(em, "lookRight", clamp01(lookRight * 0.55));
  setExpression(em, "lookUp", clamp01(lookUp * 0.55));
  setExpression(em, "lookDown", clamp01(lookDown * 0.55));

  setExpression(em, "neutral", clamp01(1 - smile - frown - browDown));
  setExpression(em, "fun", smile * 0.35);
  setExpression(em, "extra", bs(s, "cheekPuff") * 0.5);
}

/** Face mesh 직접 morph — ARKit 52ch 전체 매핑 */
export function applyTrackingFaceMorphs(vrm: VRM, frame: AvatarTrackingFrame) {
  applyArkitFaceMorphs(vrm, frame.blendShapes);
}

/** vrm.update() 전 — 본·표정 */
export function applyTrackingRig(vrm: VRM, frame: AvatarTrackingFrame) {
  if (!frame.detected || !frame.pose) return;

  const { yaw, pitch, roll, tx = 0, ty = 0, tz = 0 } = frame.pose;
  const smooth = 0.32;

  const bodyTurn = THREE.MathUtils.clamp(yaw, -1.4, 1.4);
  const targetBodyY = Math.PI + bodyTurn * 0.95;
  vrm.scene.rotation.y = THREE.MathUtils.lerp(vrm.scene.rotation.y, targetBodyY, smooth);

  const headOnlyYaw = yaw - bodyTurn * 0.42;
  applySpineCascade(vrm, headOnlyYaw, pitch, roll, smooth);
  applyHeadBone(vrm, headOnlyYaw, pitch, roll, smooth);
  applyHeadTranslation(vrm, tx, ty, tz, smooth);
  applyEyeGaze(vrm, frame.blendShapes, smooth);
  applyVrmExpressions(vrm, frame);
  applyBodyTracking(vrm, frame);
  applyFootPlanting(vrm, frame);
  applyLookAtCamera(vrm, frame);
}

export function resetTrackingRig(vrm: VRM) {
  vrm.scene.rotation.y = THREE.MathUtils.lerp(vrm.scene.rotation.y, Math.PI, 0.2);

  const resetBone = (bone: VRMHumanBoneName) => {
    const node = vrm.humanoid?.getNormalizedBoneNode(bone);
    if (!node) return;
    node.rotation.x = THREE.MathUtils.lerp(node.rotation.x, 0, 0.2);
    node.rotation.y = THREE.MathUtils.lerp(node.rotation.y, 0, 0.2);
    node.rotation.z = THREE.MathUtils.lerp(node.rotation.z, 0, 0.2);
    node.position.x = THREE.MathUtils.lerp(node.position.x, 0, 0.2);
    node.position.y = THREE.MathUtils.lerp(node.position.y, 0, 0.2);
    node.position.z = THREE.MathUtils.lerp(node.position.z, 0, 0.2);
  };

  for (const bone of [...SPINE_CHAIN, "head", "leftEye", "rightEye"] as const) {
    resetBone(bone);
  }
  resetBodyTracking(vrm);
  resetSpringPhysics(vrm);
}
