import * as THREE from "three";
import type { VRM } from "@pixiv/three-vrm";
import type { FaceBlendShapeMap } from "@/lib/virtual-avatar/tracking/types";

type MorphBind = { morph: string; gain: number };

/** ARKit → VRM Face morph 직접 매핑 (표정 50+ 채널) */
export const ARKIT_FACE_MORPH_MAP: Record<string, MorphBind[]> = {
  browDownLeft: [{ morph: "Face_Blendshape.Fcl_BRW_Angry", gain: 0.9 }],
  browDownRight: [{ morph: "Face_Blendshape.Fcl_BRW_Angry", gain: 0.9 }],
  browOuterUpLeft: [{ morph: "Face_Blendshape.Fcl_BRW_Surprised", gain: 0.85 }],
  browOuterUpRight: [{ morph: "Face_Blendshape.Fcl_BRW_Surprised", gain: 0.85 }],
  browInnerUp: [{ morph: "Face_Blendshape.Fcl_BRW_Surprised", gain: 0.55 }],
  mouthFrownLeft: [{ morph: "Face_Blendshape.Fcl_BRW_Sorrow", gain: 0.7 }],
  mouthFrownRight: [{ morph: "Face_Blendshape.Fcl_BRW_Sorrow", gain: 0.7 }],
  eyeSquintLeft: [{ morph: "Face_Blendshape.Fcl_EYE_Angry", gain: 0.45 }],
  eyeSquintRight: [{ morph: "Face_Blendshape.Fcl_EYE_Angry", gain: 0.45 }],
  eyeWideLeft: [{ morph: "Face_Blendshape.Fcl_EYE_Surprised", gain: 0.5 }],
  eyeWideRight: [{ morph: "Face_Blendshape.Fcl_EYE_Surprised", gain: 0.5 }],
  mouthSmileLeft: [
    { morph: "Face_Blendshape.Fcl_EYE_Joy", gain: 0.4 },
    { morph: "Face_Blendshape.Fcl_MTH_Joy", gain: 0.75 },
  ],
  mouthSmileRight: [
    { morph: "Face_Blendshape.Fcl_EYE_Joy", gain: 0.4 },
    { morph: "Face_Blendshape.Fcl_MTH_Joy", gain: 0.75 },
  ],
  mouthSadLeft: [{ morph: "Face_Blendshape.Fcl_EYE_Sorrow", gain: 0.55 }],
  mouthSadRight: [{ morph: "Face_Blendshape.Fcl_EYE_Sorrow", gain: 0.55 }],
  mouthDimpleLeft: [{ morph: "Face_Blendshape.Fcl_MTH_Joy", gain: 0.35 }],
  mouthDimpleRight: [{ morph: "Face_Blendshape.Fcl_MTH_Joy", gain: 0.35 }],
  jawOpen: [{ morph: "Face_Blendshape.Fcl_MTH_Large", gain: 0.35 }],
  mouthClose: [{ morph: "Face_Blendshape.Fcl_MTH_Small", gain: 0.4 }],
  mouthFunnel: [{ morph: "Face_Blendshape.Fcl_MTH_Surprised", gain: 0.35 }],
  mouthPucker: [{ morph: "Face_Blendshape.Fcl_MTH_Surprised", gain: 0.25 }],
  mouthUpperUpLeft: [{ morph: "Face_Blendshape.Fcl_MTH_Up", gain: 0.45 }],
  mouthUpperUpRight: [{ morph: "Face_Blendshape.Fcl_MTH_Up", gain: 0.45 }],
  mouthLowerDownLeft: [{ morph: "Face_Blendshape.Fcl_MTH_Down", gain: 0.45 }],
  mouthLowerDownRight: [{ morph: "Face_Blendshape.Fcl_MTH_Down", gain: 0.45 }],
  mouthShrugUpper: [{ morph: "Face_Blendshape.Fcl_MTH_SkinFung", gain: 0.35 }],
  mouthShrugLower: [{ morph: "Face_Blendshape.Fcl_MTH_SkinFung", gain: 0.35 }],
  cheekPuff: [{ morph: "Face_Blendshape.Fcl_MTH_SkinFung", gain: 0.25 }],
  noseSneerLeft: [{ morph: "Face_Blendshape.Fcl_MTH_Angry", gain: 0.35 }],
  noseSneerRight: [{ morph: "Face_Blendshape.Fcl_MTH_Angry", gain: 0.35 }],
  eyeBlinkLeft: [{ morph: "Face_Blendshape.Fcl_EYE_Close", gain: 0.95 }],
  eyeBlinkRight: [{ morph: "Face_Blendshape.Fcl_EYE_Close", gain: 0.95 }],
  eyeLookUpLeft: [{ morph: "Face_Blendshape.Fcl_EYE_Surprised", gain: 0.25 }],
  eyeLookUpRight: [{ morph: "Face_Blendshape.Fcl_EYE_Surprised", gain: 0.25 }],
  eyeLookDownLeft: [{ morph: "Face_Blendshape.Fcl_EYE_Close", gain: 0.2 }],
  eyeLookDownRight: [{ morph: "Face_Blendshape.Fcl_EYE_Close", gain: 0.2 }],
  eyeLookInLeft: [{ morph: "Face_Blendshape.Fcl_EYE_Spread", gain: 0.15 }],
  eyeLookInRight: [{ morph: "Face_Blendshape.Fcl_EYE_Spread", gain: 0.15 }],
  eyeLookOutLeft: [{ morph: "Face_Blendshape.Fcl_EYE_Spread", gain: 0.15 }],
  eyeLookOutRight: [{ morph: "Face_Blendshape.Fcl_EYE_Spread", gain: 0.15 }],
  cheekSquintLeft: [{ morph: "Face_Blendshape.Fcl_EYE_Joy", gain: 0.35 }],
  cheekSquintRight: [{ morph: "Face_Blendshape.Fcl_EYE_Joy", gain: 0.35 }],
  jawForward: [{ morph: "Face_Blendshape.Fcl_MTH_Large", gain: 0.2 }],
  jawLeft: [{ morph: "Face_Blendshape.Fcl_MTH_Angry", gain: 0.25 }],
  jawRight: [{ morph: "Face_Blendshape.Fcl_MTH_Angry", gain: 0.25 }],
  mouthLeft: [{ morph: "Face_Blendshape.Fcl_MTH_Angry", gain: 0.2 }],
  mouthRight: [{ morph: "Face_Blendshape.Fcl_MTH_Angry", gain: 0.2 }],
  mouthRollUpper: [{ morph: "Face_Blendshape.Fcl_MTH_Small", gain: 0.35 }],
  mouthRollLower: [{ morph: "Face_Blendshape.Fcl_MTH_Small", gain: 0.35 }],
  mouthStretchLeft: [{ morph: "Face_Blendshape.Fcl_MTH_Large", gain: 0.3 }],
  mouthStretchRight: [{ morph: "Face_Blendshape.Fcl_MTH_Large", gain: 0.3 }],
  mouthPressLeft: [{ morph: "Face_Blendshape.Fcl_MTH_Small", gain: 0.35 }],
  mouthPressRight: [{ morph: "Face_Blendshape.Fcl_MTH_Small", gain: 0.35 }],
};

const meshCache = new WeakMap<VRM, THREE.Mesh>();

function getFaceMesh(vrm: VRM): THREE.Mesh | null {
  const c = meshCache.get(vrm);
  if (c) return c;
  let mesh: THREE.Mesh | null = null;
  vrm.scene.traverse((o) => {
    if (mesh) return;
    const m = o as THREE.Mesh;
    if (m.isMesh && m.name === "Face") mesh = m;
  });
  if (mesh) meshCache.set(vrm, mesh);
  return mesh;
}

/** ARKit 52ch → Face morph 누적 적용 */
export function applyArkitFaceMorphs(vrm: VRM, shapes: FaceBlendShapeMap) {
  const mesh = getFaceMesh(vrm);
  if (!mesh?.morphTargetInfluences || !mesh.morphTargetDictionary) return;

  const dict = mesh.morphTargetDictionary;
  const inf = mesh.morphTargetInfluences;
  const accum = new Map<number, number>();

  for (const [arkit, binds] of Object.entries(ARKIT_FACE_MORPH_MAP)) {
    const score = shapes[arkit] ?? 0;
    if (score <= 0.001) continue;
    for (const { morph, gain } of binds) {
      const idx = dict[morph];
      if (idx === undefined) continue;
      accum.set(idx, Math.min(1, (accum.get(idx) ?? 0) + score * gain));
    }
  }

  for (const [arkit, score] of Object.entries(shapes)) {
    if (score <= 0.001 || ARKIT_FACE_MORPH_MAP[arkit]) continue;
    const hint = arkit.toLowerCase();
    for (const [morphName, idx] of Object.entries(dict)) {
      const mn = morphName.toLowerCase();
      if (
        (hint.includes("eye") && mn.includes("eye")) ||
        (hint.includes("mouth") && mn.includes("mth")) ||
        (hint.includes("brow") && mn.includes("brw")) ||
        (hint.includes("jaw") && mn.includes("mth"))
      ) {
        accum.set(idx, Math.min(1, (accum.get(idx) ?? 0) + score * 0.25));
      }
    }
  }

  for (const [idx, value] of accum) {
    if (idx >= 0 && idx < inf.length) {
      inf[idx] = Math.max(inf[idx] ?? 0, value);
    }
  }
}
