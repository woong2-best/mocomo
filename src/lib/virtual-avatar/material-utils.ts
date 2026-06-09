import * as THREE from "three";

export type MToonLike = THREE.Material & {
  isMToonMaterial?: boolean;
  isOutline?: boolean;
  color?: THREE.Color;
  litFactor?: THREE.Color;
  shadeColorFactor?: THREE.Color;
  parametricRimColorFactor?: THREE.Color;
  matcapFactor?: THREE.Color;
  shadingToonyFactor?: number;
  giEqualizationFactor?: number;
  rimLightingMixFactor?: number;
  outlineWidthFactor?: number;
  outlineColorFactor?: THREE.Color;
  outlineLightingMixFactor?: number;
  emissive?: THREE.Color;
  emissiveIntensity?: number;
  emissiveMap?: THREE.Texture | null;
  map?: THREE.Texture | null;
  normalMap?: THREE.Texture | null;
  shadeMultiplyTexture?: THREE.Texture | null;
  shadingShiftTexture?: THREE.Texture | null;
  rimMultiplyTexture?: THREE.Texture | null;
  matcapTexture?: THREE.Texture | null;
  outlineWidthMultiplyTexture?: THREE.Texture | null;
  uvAnimationMaskTexture?: THREE.Texture | null;
  uniformsNeedUpdate?: boolean;
  update?: (delta: number) => void;
};

const MTOON_TINT_TEXTURE_KEYS = [
  "map",
  "emissiveMap",
  "shadeMultiplyTexture",
  "shadingShiftTexture",
  "rimMultiplyTexture",
  "matcapTexture",
  "outlineWidthMultiplyTexture",
  "uvAnimationMaskTexture",
] as const;

function clearMToonTintTextures(mat: MToonLike) {
  for (const key of MTOON_TINT_TEXTURE_KEYS) {
    if (key in mat) mat[key] = null;
  }
}

export function isMToonMaterial(mat: THREE.Material): mat is MToonLike {
  return !!(mat as MToonLike).isMToonMaterial;
}

export function isHairMaterial(mat: THREE.Material): boolean {
  const name = (mat.name || "").toLowerCase();
  return name.includes("hair") || name.endsWith("_hair");
}

export function isSkinMaterial(mat: THREE.Material): boolean {
  const name = (mat.name || "").toLowerCase();
  if (isHairMaterial(mat)) return false;
  return name.includes("skin") || name.includes("face") || name.includes("body");
}

export function isNativeClothMaterial(mat: THREE.Material): boolean {
  const name = (mat.name || "").toLowerCase();
  return (
    name.includes("tops_") ||
    name.includes("bottoms_") ||
    name.includes("shoes_") ||
    name.endsWith("_cloth")
  );
}

export type ClothingMaterialOpts = {
  emissive?: THREE.Color;
  emissiveIntensity?: number;
  shadeDarken?: number;
  roughness?: number;
  metalness?: number;
};

export function setMaterialColor(
  mat: THREE.Material,
  color: THREE.Color,
  opts?: ClothingMaterialOpts
) {
  if (isMToonMaterial(mat)) {
    if (mat.color instanceof THREE.Color) mat.color.copy(color);
    if (mat.litFactor instanceof THREE.Color) mat.litFactor.copy(color);
    if (mat.shadeColorFactor instanceof THREE.Color) {
      const shade = color.clone();
      shade.multiplyScalar(opts?.shadeDarken ?? 0.72);
      mat.shadeColorFactor.copy(shade);
    }
    if (mat.parametricRimColorFactor instanceof THREE.Color) {
      const rim = color.clone();
      rim.multiplyScalar(0.92);
      mat.parametricRimColorFactor.copy(rim);
    }
    if (mat.matcapFactor instanceof THREE.Color) mat.matcapFactor.setRGB(1, 1, 1);
    if (mat.emissive instanceof THREE.Color) mat.emissive.setRGB(0, 0, 0);
    if ("emissiveIntensity" in mat && typeof mat.emissiveIntensity === "number") {
      mat.emissiveIntensity = 0;
    }
  } else if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
    mat.color.copy(color);
  } else if ("color" in mat && mat.color instanceof THREE.Color) {
    mat.color.copy(color);
  }

  if (opts?.emissive) {
    if ("emissive" in mat && mat.emissive instanceof THREE.Color) {
      mat.emissive.copy(opts.emissive);
      if ("emissiveIntensity" in mat && typeof opts.emissiveIntensity === "number") {
        (mat as THREE.MeshStandardMaterial).emissiveIntensity = opts.emissiveIntensity;
      }
    }
  }
}

/** 의상 단색 적용 — 기존 텍스처(줄무늬 등)를 제거해 카탈로그 색이 그대로 보이게 */
export function setSolidClothingColor(mat: THREE.Material, color: THREE.Color, opts?: ClothingMaterialOpts) {
  setMaterialColor(mat, color, opts);

  if (isMToonMaterial(mat)) {
    clearMToonTintTextures(mat);
    if (mat.normalMap) mat.normalMap = null;
    if (opts?.emissiveIntensity && mat.emissive instanceof THREE.Color) {
      mat.emissive.copy(color);
      mat.emissiveIntensity = opts.emissiveIntensity;
    }
    mat.uniformsNeedUpdate = true;
    mat.needsUpdate = true;
    return;
  }

  if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
    mat.map = null;
    mat.normalMap = null;
    mat.aoMap = null;
    if (typeof opts?.roughness === "number") mat.roughness = opts.roughness;
    if (typeof opts?.metalness === "number") mat.metalness = opts.metalness;
    if (typeof opts?.emissiveIntensity === "number") {
      mat.emissive.copy(color);
      mat.emissiveIntensity = opts.emissiveIntensity;
    }
    mat.needsUpdate = true;
  }
}

/** VRM 헤어(MToon) 단색 — lit/shade/outline 텍스처까지 제거 */
export function setSolidHairColor(mat: THREE.Material, color: THREE.Color) {
  setSolidClothingColor(mat, color, { shadeDarken: 0.55, roughness: 0.74 });

  if (!isMToonMaterial(mat)) return;

  if (mat.outlineColorFactor instanceof THREE.Color) {
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    const outline = color.clone();
    outline.multiplyScalar(hsl.l < 0.08 ? 0.85 : 0.42);
    mat.outlineColorFactor.copy(outline);
  }
  if (typeof mat.outlineLightingMixFactor === "number") {
    mat.outlineLightingMixFactor = 0;
  }
  mat.uniformsNeedUpdate = true;
}

export function applyTextureToMaterial(
  mat: THREE.Material,
  texture: THREE.Texture,
  mode: "emissive" | "multiply"
) {
  if (mode === "emissive") {
    if (isMToonMaterial(mat) || mat instanceof THREE.MeshStandardMaterial) {
      if ("emissiveMap" in mat) mat.emissiveMap = texture;
      if ("emissive" in mat && mat.emissive instanceof THREE.Color) mat.emissive.setRGB(1, 1, 1);
      if ("emissiveIntensity" in mat) (mat as THREE.MeshStandardMaterial).emissiveIntensity = 0.35;
    }
    return;
  }

  if (isMToonMaterial(mat)) {
    mat.map = texture;
    return;
  }
  if (mat instanceof THREE.MeshStandardMaterial) {
    mat.map = texture;
  }
}

export function collectSceneMaterials(root: THREE.Object3D): THREE.Material[] {
  const mats = new Set<THREE.Material>();
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    list.forEach((m) => mats.add(m));
  });
  return [...mats];
}

export function tickMToonMaterials(materials: THREE.Material[], dt: number) {
  materials.forEach((m) => {
    if (isMToonMaterial(m) && typeof m.update === "function") m.update(dt);
  });
}
