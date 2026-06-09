import * as THREE from "three";
import type { VRM } from "@pixiv/three-vrm";
import type { VRMHumanBoneName } from "@pixiv/three-vrm-core";
import type { AvatarConfig, AvatarFaceParams } from "@/lib/virtual-avatar/types";
import { getFaceShapeBones } from "@/lib/virtual-avatar/face-shape-profiles";
import { EYE_COLORS, LIP_COLORS, SKIN_TONES, adjustSkinColor } from "@/lib/virtual-avatar/presets";
import { setMaterialColor, setSolidClothingColor } from "@/lib/virtual-avatar/material-utils";
import { getCatalogItem } from "@/lib/virtual-avatar/avatar-catalog";
import { HAIR_COLOR_BY_INDEX } from "@/lib/virtual-avatar/face-morph-colors";

const FACE_BONES = ["head", "jaw"] as const satisfies readonly VRMHumanBoneName[];

type Vec3 = { x: number; y: number; z: number };

const MORPH_KEYS = {
  eyeNatural: "Face_Blendshape.Fcl_EYE_Natural",
  eyeClose: "Face_Blendshape.Fcl_EYE_Close",
  eyeCloseL: "Face_Blendshape.Fcl_EYE_Close_L",
  eyeCloseR: "Face_Blendshape.Fcl_EYE_Close_R",
  eyeJoy: "Face_Blendshape.Fcl_EYE_Joy",
  eyeSurprised: "Face_Blendshape.Fcl_EYE_Surprised",
  eyeSpread: "Face_Blendshape.Fcl_EYE_Spread",
  eyeAngry: "Face_Blendshape.Fcl_EYE_Angry",
  eyeSad: "Face_Blendshape.Fcl_EYE_Sad",
  browAngry: "Face_Blendshape.Fcl_BROW_Angry",
  browSad: "Face_Blendshape.Fcl_BROW_Sad",
  mthSmall: "Face_Blendshape.Fcl_MTH_Small",
  mthLarge: "Face_Blendshape.Fcl_MTH_Large",
  mthUp: "Face_Blendshape.Fcl_MTH_Up",
  mthDown: "Face_Blendshape.Fcl_MTH_Down",
  mthSkinFung: "Face_Blendshape.Fcl_MTH_SkinFung",
  mthAngry: "Face_Blendshape.Fcl_MTH_Angry",
  mthSad: "Face_Blendshape.Fcl_MTH_Sad",
} as const;

const FALLBACK_MORPH_INDEX: Record<keyof typeof MORPH_KEYS, number> = {
  eyeNatural: 11,
  eyeClose: 12,
  eyeCloseL: 13,
  eyeCloseR: 14,
  eyeJoy: 17,
  eyeSurprised: 21,
  eyeSpread: 24,
  eyeAngry: 15,
  eyeSad: 16,
  browAngry: 0,
  browSad: 1,
  mthSmall: 34,
  mthLarge: 35,
  mthUp: 32,
  mthDown: 33,
  mthSkinFung: 41,
  mthAngry: 36,
  mthSad: 37,
};

const faceMeshCache = new WeakMap<VRM, THREE.Mesh>();

function norm(value: number, baseline: number, span: number): number {
  return (value - baseline) / span;
}

function clamp01(v: number): number {
  return THREE.MathUtils.clamp(v, 0, 1);
}

function v(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

function eyeOpenAmount(eyeSize: number): number {
  return clamp01(0.1 + (eyeSize / 100) * 0.9);
}

function applyFaceShapeMorphs(mesh: THREE.Mesh, face: AvatarFaceParams) {
  const shape = getFaceShapeBones(face.faceShape);
  const widthHint = shape.jaw.x;
  if (widthHint > 1.05) {
    setMorph(mesh, "mthLarge", clamp01((widthHint - 1) * 0.35));
    setMorph(mesh, "mthSmall", 0);
  } else if (widthHint < 0.95) {
    setMorph(mesh, "mthSmall", clamp01((1 - widthHint) * 0.4));
    setMorph(mesh, "mthLarge", 0);
  }

  switch (face.faceShape) {
    case "heart":
    case "invertedTriangle":
      setMorph(mesh, "mthUp", 0.12);
      break;
    case "long":
      setMorph(mesh, "mthDown", 0.1);
      break;
    case "round":
      setMorph(mesh, "eyeJoy", 0.08);
      break;
    default:
      break;
  }
}

function getFaceMesh(vrm: VRM): THREE.Mesh | null {
  const cached = faceMeshCache.get(vrm);
  if (cached) return cached;
  let mesh: THREE.Mesh | null = null;
  vrm.scene.traverse((obj) => {
    if (mesh) return;
    const candidate = obj as THREE.Mesh;
    if (candidate.isMesh && candidate.name === "Face") mesh = candidate;
  });
  if (mesh) faceMeshCache.set(vrm, mesh);
  return mesh;
}

function morphIndex(mesh: THREE.Mesh, key: keyof typeof MORPH_KEYS): number {
  const name = MORPH_KEYS[key];
  const dict = mesh.morphTargetDictionary;
  if (dict && name in dict) return dict[name];
  return FALLBACK_MORPH_INDEX[key];
}

function setMorph(mesh: THREE.Mesh, key: keyof typeof MORPH_KEYS, value: number) {
  const influences = mesh.morphTargetInfluences;
  if (!influences) return;
  const idx = morphIndex(mesh, key);
  if (idx >= 0 && idx < influences.length) influences[idx] = clamp01(value);
}

function mergeMorphClose(
  mesh: THREE.Mesh,
  key: "eyeClose" | "eyeCloseL" | "eyeCloseR",
  sizeClose: number
) {
  const influences = mesh.morphTargetInfluences;
  if (!influences) return;
  const idx = morphIndex(mesh, key);
  if (idx < 0 || idx >= influences.length) return;
  influences[idx] = clamp01(Math.max(influences[idx] ?? 0, sizeClose));
}

function setRawBoneScale(vrm: VRM, bone: VRMHumanBoneName, scale: Vec3) {
  const node = vrm.humanoid?.getRawBoneNode(bone);
  if (node) node.scale.set(scale.x, scale.y, scale.z);
}

function resetFaceBoneScales(vrm: VRM) {
  for (const bone of FACE_BONES) setRawBoneScale(vrm, bone, v(1, 1, 1));
}

function applyEyeMorphs(mesh: THREE.Mesh, face: AvatarFaceParams) {
  const open = eyeOpenAmount(face.eyeSize);
  const sizeClose = clamp01((1 - open) * 0.96);
  mergeMorphClose(mesh, "eyeClose", sizeClose);
  mergeMorphClose(mesh, "eyeCloseL", sizeClose);
  mergeMorphClose(mesh, "eyeCloseR", sizeClose);

  const openCurve = open * open;
  setMorph(mesh, "eyeJoy", openCurve * 0.42);

  const depthD = norm(face.eyeDepth, 48, 48);
  setMorph(mesh, "eyeSad", clamp01(Math.max(0, -depthD * 0.5)));
  setMorph(mesh, "eyeAngry", clamp01(Math.max(0, depthD * 0.35)));

  const pupilD = norm(face.pupilSize, 50, 50);
  setMorph(mesh, "eyeSurprised", clamp01(openCurve * 0.28 + Math.max(0, pupilD) * 0.25));

  const eyelid = (face.doubleEyelid / 100) * clamp01(open * 1.3);
  setMorph(mesh, "eyeNatural", eyelid * 0.75);

  const eyeSpacingD = norm(face.eyeSpacing, 50, 50);
  setMorph(mesh, "eyeSpread", clamp01(Math.max(0, eyeSpacingD * 0.9)));
}

function applyBrowMorphs(mesh: THREE.Mesh, face: AvatarFaceParams) {
  const thickD = norm(face.browThickness, 45, 45);
  const heightD = norm(face.browHeight, 52, 52);
  setMorph(mesh, "browAngry", clamp01(thickD * 0.45 + Math.max(0, heightD) * 0.2));
  setMorph(mesh, "browSad", clamp01(Math.max(0, -heightD) * 0.55 + Math.max(0, -thickD) * 0.3));
}

function applyMouthMorphs(mesh: THREE.Mesh, face: AvatarFaceParams) {
  const lipWidthD = norm(face.lipWidth, 52, 52);
  setMorph(mesh, "mthLarge", lipWidthD > 0 ? lipWidthD * 0.88 : 0);
  setMorph(mesh, "mthSmall", lipWidthD < 0 ? -lipWidthD * 0.88 : 0);

  const lipThickD = norm(face.lipThickness, 48, 48);
  setMorph(mesh, "mthUp", lipThickD > 0 ? lipThickD * 0.78 : 0);
  setMorph(mesh, "mthDown", lipThickD < 0 ? -lipThickD * 0.6 : 0);
  setMorph(mesh, "mthSkinFung", lipThickD > 0 ? lipThickD * 0.4 : 0);

  const cornerD = norm(face.mouthCorner, 55, 55);
  setMorph(mesh, "mthAngry", cornerD < 0 ? -cornerD * 0.5 : 0);
  setMorph(mesh, "mthSad", cornerD < -0.2 ? -cornerD * 0.35 : 0);

  const philtrumD = norm(face.philtrum, 50, 50);
  if (philtrumD > 0) setMorph(mesh, "mthUp", clamp01(lipThickD > 0 ? lipThickD * 0.78 + philtrumD * 0.15 : philtrumD * 0.15));
}

function applyHeadStructure(vrm: VRM, face: AvatarFaceParams) {
  const bones = getFaceShapeBones(face.faceShape);
  const jawWidthD = norm(face.jawWidth, 50, 50);
  const jawAngleD = norm(face.jawAngle, 50, 50);
  const chinLenD = norm(face.chinLength, 50, 50);
  const chinPointD = norm(face.chinPoint, 50, 50);
  const cheekD = norm(face.cheekbone, 50, 50);
  const foreheadD = norm(face.forehead, 50, 50);
  const noseSizeD = norm(face.noseSize, 42, 42);
  const noseHeightD = norm(face.noseHeight, 50, 50);
  const noseWidthD = norm(face.noseWidth, 45, 45);
  const noseBridgeD = norm(face.noseBridge, 50, 50);
  const noseTipD = norm(face.noseTip, 48, 48);

  setRawBoneScale(vrm, "head", {
    x: bones.head.x * (1 + jawWidthD * 0.12 + cheekD * 0.1 + noseWidthD * 0.06),
    y: bones.head.y * (1 + foreheadD * 0.1 + chinLenD * 0.08 + noseHeightD * 0.06),
    z: bones.head.z * (1 + noseSizeD * 0.1 + noseBridgeD * 0.08 + noseTipD * 0.08 + chinPointD * 0.06),
  });

  setRawBoneScale(vrm, "jaw", {
    x: bones.jaw.x * (1 + jawWidthD * 0.16),
    y: bones.jaw.y * (1 + chinLenD * 0.14 + chinPointD * 0.1),
    z: bones.jaw.z * (1 + jawAngleD * 0.12),
  });
}

export function applyFaceNormalizedAdjustments(
  vrm: VRM,
  face: AvatarFaceParams,
  opts?: { trackingLive?: boolean }
) {
  const eyeTiltD = norm(face.eyeTilt, 50, 50);
  const eyeHeightD = norm(face.eyeHeight, 50, 50);
  const browTiltD = norm(face.browTilt, 50, 50);
  const browSpaceD = norm(face.browSpacing, 50, 50);

  const tilt = eyeTiltD * 0.24;
  const leftEye = vrm.humanoid?.getNormalizedBoneNode("leftEye");
  const rightEye = vrm.humanoid?.getNormalizedBoneNode("rightEye");
  if (leftEye) {
    leftEye.rotation.z = tilt + browTiltD * 0.08;
    if (!opts?.trackingLive) leftEye.position.y = eyeHeightD * 0.008;
    if (!opts?.trackingLive) leftEye.position.x = -0.032 - browSpaceD * 0.012;
  }
  if (rightEye) {
    rightEye.rotation.z = -tilt - browTiltD * 0.08;
    if (!opts?.trackingLive) rightEye.position.y = eyeHeightD * 0.008;
    if (!opts?.trackingLive) rightEye.position.x = 0.032 + browSpaceD * 0.012;
  }
}

export function applyFaceMorphToVrm(
  vrm: VRM,
  face: AvatarFaceParams,
  opts?: { trackingLive?: boolean }
) {
  resetFaceBoneScales(vrm);
  applyHeadStructure(vrm, face);

  const mesh = getFaceMesh(vrm);
  if (!mesh) return;

  if (!opts?.trackingLive) {
    applyEyeMorphs(mesh, face);
    applyBrowMorphs(mesh, face);
    applyMouthMorphs(mesh, face);
    applyFaceShapeMorphs(mesh, face);
  } else {
    applyBrowMorphs(mesh, face);
    applyFaceShapeMorphs(mesh, face);
  }
}

export function stabilizeVrmSpringBones(vrm: VRM) {
  vrm.springBoneManager?.reset();
}

function setMeshColor(
  mesh: THREE.Mesh,
  color: THREE.Color,
  emissive?: THREE.Color,
  emissiveIntensity?: number
) {
  mesh.visible = true;
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  mats.forEach((m) => {
    setMaterialColor(m, color, { emissive, emissiveIntensity, shadeDarken: 0.72 });
  });
}

function setHairMeshColor(mesh: THREE.Mesh, color: THREE.Color) {
  mesh.visible = true;
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  mats.forEach((m) => {
    setSolidClothingColor(m, color, { shadeDarken: 0.68, roughness: 0.74 });
  });
}

export function applyAppearanceToVrm(vrm: VRM, config: AvatarConfig) {
  const { face, skin, hair, outfit, equipped } = config;
  const skinHex = SKIN_TONES[skin.toneIndex]?.hex ?? SKIN_TONES[2].hex;
  const skinColor = new THREE.Color(adjustSkinColor(skinHex, skin.brightness, skin.saturation));

  const hairCatalog = equipped.hairId ? getCatalogItem(equipped.hairId) : undefined;
  const hairStyle = hairCatalog?.appearance.hairStyle ?? hair.style;
  const hairColor = new THREE.Color(HAIR_COLOR_BY_INDEX[hair.colorIndex] ?? "#1a1a1a");

  const eyeColor = new THREE.Color(EYE_COLORS[face.eyeColorIndex]?.hex ?? "#4a6741");
  const lipColor = new THREE.Color(LIP_COLORS[face.makeup.lipColorIndex]?.hex ?? "#e879a0");
  const accentColor = new THREE.Color(outfit.accentColor);

  vrm.scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const name = mesh.name.toLowerCase();

    if (name.includes("hair")) {
      const vol = 0.92 + (hair.volume / 100) * 0.22 + (hairStyle % 5) * 0.02;
      mesh.scale.set(vol, 0.85 + (hair.length / 100) * 0.35, vol);
      setHairMeshColor(mesh, hairColor);
      return;
    }

    if (name.includes("eye") && !name.includes("brow")) {
      setMeshColor(mesh, eyeColor, eyeColor, 0.08 + (face.makeup.mascara / 100) * 0.12);
      return;
    }

    if (name.includes("face") || name.includes("body") || name.includes("skin")) {
      setMeshColor(mesh, skinColor);
      if (skin.glow) setMeshColor(mesh, skinColor, skinColor, 0.06);
      return;
    }

    if (
      name.includes("tops_") ||
      name.includes("bottoms_") ||
      name.includes("shoes_") ||
      name.endsWith("_cloth")
    ) {
      return;
    }

    if (name.includes("accessory") || name.includes("acc")) {
      mesh.visible = outfit.layers.accessories && !!equipped.accessoryId;
      if (mesh.visible) setMeshColor(mesh, accentColor);
      return;
    }

    if (name.includes("hat") || name.includes("headwear") || name.includes("cap")) {
      mesh.visible = outfit.layers.headwear && !!equipped.headwearId;
      if (mesh.visible) setMeshColor(mesh, accentColor);
    }
  });

  const mesh = getFaceMesh(vrm);
  if (mesh && config.effects?.renderQuality === "performance") {
    const m = face.makeup;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((mat) => {
      if (!("emissive" in mat) || !(mat.emissive instanceof THREE.Color)) return;
      mat.emissive.setRGB(
        (m.lipstick / 100) * lipColor.r * 0.15 + (m.blushIntensity / 100) * 0.06,
        (m.lipstick / 100) * lipColor.g * 0.12 + (m.blushIntensity / 100) * 0.04,
        (m.eyeshadow / 100) * 0.08 + (m.highlight / 100) * 0.05
      );
      if ("emissiveIntensity" in mat) {
        (mat as THREE.MeshStandardMaterial).emissiveIntensity =
          0.04 + (m.lipstick + m.blushIntensity + m.highlight) / 300;
      }
    });
  }
}
