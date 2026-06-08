import * as THREE from "three";

export type MToonLike = THREE.Material & {
  isMToonMaterial?: boolean;
  color?: THREE.Color;
  shadeColorFactor?: THREE.Color;
  shadingToonyFactor?: number;
  outlineWidthFactor?: number;
  emissive?: THREE.Color;
  emissiveIntensity?: number;
  emissiveMap?: THREE.Texture | null;
  map?: THREE.Texture | null;
  update?: (delta: number) => void;
};

export function isMToonMaterial(mat: THREE.Material): mat is MToonLike {
  return !!(mat as MToonLike).isMToonMaterial;
}

export function setMaterialColor(
  mat: THREE.Material,
  color: THREE.Color,
  opts?: { emissive?: THREE.Color; emissiveIntensity?: number; shadeDarken?: number }
) {
  if (isMToonMaterial(mat)) {
    if (mat.color instanceof THREE.Color) mat.color.copy(color);
    if (mat.shadeColorFactor instanceof THREE.Color) {
      const shade = color.clone();
      shade.multiplyScalar(opts?.shadeDarken ?? 0.72);
      mat.shadeColorFactor.copy(shade);
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
