import * as THREE from "three";
import type { VRM } from "@pixiv/three-vrm";
import { normalizeHex } from "@/lib/color-picker-utils";
import {
  resolveHairColorPalette,
  type HairColorPalette,
  type HairPaletteOptions,
} from "@/lib/virtual-avatar/hair-color-model";
import { isMToonMaterial, type MToonLike } from "@/lib/virtual-avatar/material-utils";

let solidWhiteMap: THREE.DataTexture | null = null;

function getSolidWhiteMap(): THREE.DataTexture {
  if (!solidWhiteMap) {
    const data = new Uint8Array([255, 255, 255, 255]);
    solidWhiteMap = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
    solidWhiteMap.colorSpace = THREE.SRGBColorSpace;
    solidWhiteMap.needsUpdate = true;
    solidWhiteMap.name = "mocomo_hair_solid_white";
  }
  return solidWhiteMap;
}

export function isHairMaterialName(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes("hair") || n.endsWith("_hair");
}

type HairMaterialSlot = {
  mat: MToonLike;
  outline: boolean;
};

const slotsByVrm = new WeakMap<VRM, HairMaterialSlot[]>();
const lastPaletteKeyByMat = new WeakMap<THREE.Material, string>();

function collectHairMaterials(vrm: VRM): HairMaterialSlot[] {
  const slots: HairMaterialSlot[] = [];
  vrm.scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((raw) => {
      if (!isHairMaterialName(raw.name || "")) return;
      if (!isMToonMaterial(raw)) return;
      slots.push({ mat: raw, outline: !!raw.isOutline });
    });
  });
  return slots;
}

export function registerVrmHairTint(vrm: VRM): HairMaterialSlot[] {
  const slots = collectHairMaterials(vrm);
  slotsByVrm.set(vrm, slots);
  return slots;
}

function colorUniform(mat: MToonLike, key: "litFactor" | "shadeColorFactor" | "outlineColorFactor" | "parametricRimColorFactor") {
  if (key === "litFactor" && mat.litFactor instanceof THREE.Color) return mat.litFactor;
  if (key === "shadeColorFactor" && mat.shadeColorFactor instanceof THREE.Color) return mat.shadeColorFactor;
  if (key === "outlineColorFactor" && mat.outlineColorFactor instanceof THREE.Color) return mat.outlineColorFactor;
  if (key === "parametricRimColorFactor" && mat.parametricRimColorFactor instanceof THREE.Color) {
    return mat.parametricRimColorFactor;
  }
  const uniforms = (mat as THREE.ShaderMaterial).uniforms as Record<string, { value: THREE.Color }> | undefined;
  const v = uniforms?.[key]?.value;
  return v instanceof THREE.Color ? v : null;
}

function patchHairMaterialOnce(mat: MToonLike) {
  if (mat.userData.mocomoHairSolidPatched) return;

  const white = getSolidWhiteMap();
  mat.map = white;
  mat.shadeMultiplyTexture = white;
  mat.emissiveMap = null;
  mat.rimMultiplyTexture = null;
  mat.matcapTexture = null;
  mat.shadingShiftTexture = null;
  mat.outlineWidthMultiplyTexture = null;
  mat.uvAnimationMaskTexture = null;
  mat.normalMap = null;

  if (typeof mat.giEqualizationFactor === "number") mat.giEqualizationFactor = 0;
  if (typeof mat.rimLightingMixFactor === "number") mat.rimLightingMixFactor = 0.22;
  if (typeof mat.shadingToonyFactor === "number") mat.shadingToonyFactor = 0.78;
  if (mat.emissive instanceof THREE.Color) mat.emissive.setRGB(0, 0, 0);
  if (typeof mat.emissiveIntensity === "number") mat.emissiveIntensity = 0;
  if (typeof mat.outlineLightingMixFactor === "number") mat.outlineLightingMixFactor = 0;

  mat.userData.mocomoHairSolidPatched = true;
  mat.needsUpdate = true;
}

function paletteKey(p: HairColorPalette) {
  return `${p.base}|${p.highlight}|${p.shadow}|${p.outline}`;
}

function applyPaletteToSlot(slot: HairMaterialSlot, palette: HairColorPalette) {
  const { mat, outline } = slot;
  patchHairMaterialOnce(mat);

  const highlight = new THREE.Color(palette.highlight);
  const shadow = new THREE.Color(palette.shadow);
  const outlineCol = new THREE.Color(palette.outline);
  const base = new THREE.Color(palette.base);

  if (outline) {
    colorUniform(mat, "outlineColorFactor")?.copy(outlineCol);
    mat.uniformsNeedUpdate = true;
    return;
  }

  colorUniform(mat, "litFactor")?.copy(highlight);
  if (mat.color instanceof THREE.Color) mat.color.copy(base);
  colorUniform(mat, "shadeColorFactor")?.copy(shadow);
  colorUniform(mat, "outlineColorFactor")?.copy(outlineCol);

  const rim = colorUniform(mat, "parametricRimColorFactor");
  if (rim) {
    rim.copy(highlight);
    rim.multiplyScalar(0.35);
  }

  mat.uniformsNeedUpdate = true;
}

/**
 * 헤어 색상 유일 진입점.
 * - map/shadeMultiply: 1×1 흰색 고정 (금발 텍스처 제거)
 * - lit=highlight, shade=shadow, outline=헤어 기준 20~35% 어두운 톤
 */
export function applyVrmHairTint(vrm: VRM, hexInput: string, opts?: HairPaletteOptions) {
  const hex = normalizeHex(hexInput) ?? "#1a1a1a";
  const palette = resolveHairColorPalette(hex, opts);
  const key = paletteKey(palette);

  let slots = slotsByVrm.get(vrm);
  if (!slots?.length) slots = registerVrmHairTint(vrm);
  if (!slots.length) return;

  for (const slot of slots) {
    const prev = lastPaletteKeyByMat.get(slot.mat);
    if (prev === key && slot.mat.userData.mocomoHairSolidPatched) continue;
    applyPaletteToSlot(slot, palette);
    lastPaletteKeyByMat.set(slot.mat, key);
  }
}

export function disposeVrmHairTint(vrm: VRM) {
  slotsByVrm.delete(vrm);
}
