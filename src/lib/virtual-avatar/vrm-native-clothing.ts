import * as THREE from "three";
import type { VRM } from "@pixiv/three-vrm";
import type { AvatarBodyParams, AvatarConfig } from "@/lib/virtual-avatar/types";
import { getCatalogItem } from "@/lib/virtual-avatar/avatar-catalog";
import { computeBodyMorphScales } from "@/lib/virtual-avatar/body-morph";
import { setSolidClothingColor } from "@/lib/virtual-avatar/material-utils";

type Vec3 = { x: number; y: number; z: number };

type ClothingStyleProfile = {
  scale: Vec3;
  position: Vec3;
  roughness?: number;
  metalness?: number;
  emissiveIntensity?: number;
  shadeDarken?: number;
};

type BodyFit = {
  topWidth: number;
  topLength: number;
  topDepth: number;
  hipWidth: number;
  legLength: number;
  hipDepth: number;
};

const CLOTHING_MESH_KEYS = {
  top: ["Tops_01", "Tops_01_CLOTH"],
  bottom: ["Bottoms_01", "Bottoms_01_CLOTH"],
  shoes: ["Shoes_01", "Shoes_01_CLOTH"],
} as const;

const TOP_PROFILES: Record<string, ClothingStyleProfile> = {
  tee: { scale: v(1, 1, 1), position: v(0, 0, 0), roughness: 0.68 },
  hoodie: { scale: v(1.16, 1.1, 1.14), position: v(0, -0.012, 0.008), roughness: 0.9 },
  crop: { scale: v(0.94, 0.78, 0.92), position: v(0, 0.028, 0), roughness: 0.65 },
  blouse: { scale: v(1.06, 0.96, 1.04), position: v(0, -0.006, 0.004), roughness: 0.58 },
  jacket: { scale: v(1.12, 1.06, 1.1), position: v(0, -0.01, 0.01), roughness: 0.42, metalness: 0.1 },
  cardigan: { scale: v(1.1, 1.04, 1.08), position: v(0, -0.008, 0.006), roughness: 0.86 },
  leather: { scale: v(1.04, 1, 1.02), position: v(0, 0, 0), roughness: 0.32, metalness: 0.22 },
  frill: { scale: v(1.08, 0.98, 1.06), position: v(0, -0.004, 0.002), roughness: 0.55 },
  cyber_top: {
    scale: v(1.02, 1, 0.98),
    position: v(0, 0, 0),
    roughness: 0.35,
    metalness: 0.45,
    emissiveIntensity: 0.18,
  },
  offshoulder: { scale: v(1.1, 0.92, 1.05), position: v(0, 0.016, 0), roughness: 0.6 },
};

const BOTTOM_PROFILES: Record<string, ClothingStyleProfile> = {
  denim: { scale: v(1, 1.08, 1), position: v(0, -0.01, 0), roughness: 0.72 },
  mini_skirt: { scale: v(1.04, 0.72, 1.02), position: v(0, 0.02, 0), roughness: 0.58 },
  slacks: { scale: v(0.9, 1.28, 0.96), position: v(0, -0.04, 0), roughness: 0.62 },
  shorts: { scale: v(1.02, 0.58, 1), position: v(0, 0.04, 0), roughness: 0.66 },
  pleats: { scale: v(1.06, 0.92, 1.04), position: v(0, 0, 0), roughness: 0.55 },
  cargo: { scale: v(1.08, 1.12, 1.06), position: v(0, -0.02, 0.004), roughness: 0.78 },
  leggings: { scale: v(0.88, 1.22, 0.9), position: v(0, -0.03, 0), roughness: 0.48 },
  highwaist: { scale: v(0.96, 1.06, 0.98), position: v(0, 0.018, 0), roughness: 0.6 },
};

const SHOES_PROFILES: Record<string, ClothingStyleProfile> = {
  sneaker: { scale: v(1, 1, 1), position: v(0, 0, 0), roughness: 0.55 },
  hightop: { scale: v(1.06, 1.18, 1.04), position: v(0, 0.012, 0), roughness: 0.58 },
  loafer: { scale: v(1.04, 0.82, 1.08), position: v(0, -0.006, 0.004), roughness: 0.38, metalness: 0.15 },
  boots: { scale: v(1.08, 1.32, 1.06), position: v(0, 0.018, 0), roughness: 0.65 },
  sandal: { scale: v(1.02, 0.72, 1.04), position: v(0, -0.008, 0), roughness: 0.42 },
  flat: { scale: v(0.98, 0.78, 1.02), position: v(0, -0.004, 0), roughness: 0.5 },
};

const FULL_PROFILES: Record<
  string,
  { top: ClothingStyleProfile; bottom: ClothingStyleProfile; hideBottom?: boolean; hideShoes?: boolean }
> = {
  dress: {
    top: { scale: v(1.02, 0.88, 1.02), position: v(0, 0.01, 0), roughness: 0.52 },
    bottom: { scale: v(1.12, 1.35, 1.08), position: v(0, -0.06, 0), roughness: 0.52 },
  },
  suit: {
    top: { scale: v(1.06, 1.02, 1.04), position: v(0, -0.008, 0), roughness: 0.48, metalness: 0.08 },
    bottom: { scale: v(0.92, 1.24, 0.94), position: v(0, -0.04, 0), roughness: 0.5 },
  },
  fantasy: {
    top: { scale: v(1.1, 1.04, 1.08), position: v(0, -0.01, 0), roughness: 0.38 },
    bottom: { scale: v(1.18, 1.42, 1.12), position: v(0, -0.08, 0), roughness: 0.4 },
  },
  cyber_suit: {
    top: { scale: v(1.04, 1.08, 1), position: v(0, -0.02, 0), roughness: 0.28, metalness: 0.55, emissiveIntensity: 0.12 },
    bottom: { scale: v(0.94, 1.18, 0.92), position: v(0, -0.05, 0), roughness: 0.28, metalness: 0.55, emissiveIntensity: 0.12 },
  },
  party: {
    top: { scale: v(1.04, 0.9, 1.04), position: v(0, 0.012, 0), roughness: 0.32, metalness: 0.18 },
    bottom: { scale: v(1.14, 1.3, 1.1), position: v(0, -0.07, 0), roughness: 0.32, metalness: 0.18 },
  },
  sport: {
    top: { scale: v(0.98, 0.94, 0.96), position: v(0, 0.006, 0), roughness: 0.62 },
    bottom: { scale: v(0.96, 1.08, 0.94), position: v(0, -0.02, 0), roughness: 0.62 },
  },
  cozy: {
    top: { scale: v(1.14, 1.12, 1.12), position: v(0, -0.014, 0.006), roughness: 0.92 },
    bottom: { scale: v(1.06, 1.1, 1.04), position: v(0, -0.03, 0), roughness: 0.92 },
    hideShoes: true,
  },
};

const originalTransforms = new WeakMap<THREE.Object3D, { scale: THREE.Vector3; position: THREE.Vector3 }>();

function v(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

function computeBodyFit(body: AvatarBodyParams): BodyFit {
  const s = computeBodyMorphScales(body);
  return {
    topWidth: s.upperChest.x * s.chest.x,
    topLength: s.upperChest.y * s.spine.y,
    topDepth: s.chest.z * s.spine.z,
    hipWidth: s.hips.x,
    legLength: (s.leftUpperLeg.y + s.leftLowerLeg.y) / 2,
    hipDepth: s.hips.z,
  };
}

function matchesClothingMesh(name: string, keys: readonly string[]): boolean {
  return keys.some((key) => name === key || name.startsWith(`${key}_`));
}

function findClothingMeshes(vrm: VRM, keys: readonly string[]): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  vrm.scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (matchesClothingMesh(mesh.name, keys)) meshes.push(mesh);
  });
  return meshes;
}

function rememberTransform(obj: THREE.Object3D) {
  if (!originalTransforms.has(obj)) {
    originalTransforms.set(obj, {
      scale: obj.scale.clone(),
      position: obj.position.clone(),
    });
  }
}

function resetMeshTransform(mesh: THREE.Mesh) {
  const orig = originalTransforms.get(mesh);
  if (orig) {
    mesh.scale.copy(orig.scale);
    mesh.position.copy(orig.position);
  } else {
    mesh.scale.set(1, 1, 1);
    mesh.position.set(0, 0, 0);
  }
}

function applyClothingMaterial(mesh: THREE.Mesh, color: THREE.Color, profile: ClothingStyleProfile) {
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  mats.forEach((mat) => {
    setSolidClothingColor(mat, color, {
      roughness: profile.roughness,
      metalness: profile.metalness,
      emissiveIntensity: profile.emissiveIntensity,
      shadeDarken: profile.shadeDarken ?? 0.72,
    });
  });
}

function applyStyleToMeshes(
  meshes: THREE.Mesh[],
  profile: ClothingStyleProfile,
  fit: BodyFit,
  fitAxes: { x: keyof BodyFit; y: keyof BodyFit; z: keyof BodyFit },
  color: THREE.Color,
  visible: boolean
) {
  for (const mesh of meshes) {
    rememberTransform(mesh);
    resetMeshTransform(mesh);
    mesh.visible = visible;
    if (!visible) continue;

    mesh.scale.multiply(
      new THREE.Vector3(
        profile.scale.x * fit[fitAxes.x],
        profile.scale.y * fit[fitAxes.y],
        profile.scale.z * fit[fitAxes.z]
      )
    );
    mesh.position.add(new THREE.Vector3(profile.position.x, profile.position.y, profile.position.z));
    applyClothingMaterial(mesh, color, profile);
  }
}

/** VRM 내장 Tops/Bottoms/Shoes 메시를 체형·카탈로그 템플릿에 맞게 착장 */
export function applyNativeClothing(vrm: VRM, config: AvatarConfig) {
  const { outfit, equipped } = config;
  const fit = computeBodyFit(config.body);

  const topMeshes = findClothingMeshes(vrm, CLOTHING_MESH_KEYS.top);
  const bottomMeshes = findClothingMeshes(vrm, CLOTHING_MESH_KEYS.bottom);
  const shoesMeshes = findClothingMeshes(vrm, CLOTHING_MESH_KEYS.shoes);

  const full = equipped.fullOutfitId ? getCatalogItem(equipped.fullOutfitId) : null;
  if (full?.appearance) {
    const template = full.appearance.attachment?.template ?? "dress";
    const profile = FULL_PROFILES[template] ?? FULL_PROFILES.dress;
    const topColor = new THREE.Color(full.appearance.topColor ?? outfit.topColor);
    const bottomColor = new THREE.Color(full.appearance.bottomColor ?? outfit.bottomColor);

    applyStyleToMeshes(topMeshes, profile.top, fit, { x: "topWidth", y: "topLength", z: "topDepth" }, topColor, true);
    applyStyleToMeshes(
      bottomMeshes,
      profile.bottom,
      fit,
      { x: "hipWidth", y: "legLength", z: "hipDepth" },
      bottomColor,
      !profile.hideBottom
    );
    applyStyleToMeshes(
      shoesMeshes,
      SHOES_PROFILES.sneaker,
      fit,
      { x: "hipWidth", y: "legLength", z: "hipDepth" },
      new THREE.Color(outfit.accentColor),
      outfit.layers.shoes && !profile.hideShoes
    );
    return;
  }

  const top = getCatalogItem(equipped.topId);
  const bottom = getCatalogItem(equipped.bottomId);
  const shoes = getCatalogItem(equipped.shoesId);

  const topTemplate = top?.appearance.attachment?.template ?? "tee";
  const bottomTemplate = bottom?.appearance.attachment?.template ?? "denim";
  const shoesTemplate = shoes?.appearance.attachment?.template ?? "sneaker";

  applyStyleToMeshes(
    topMeshes,
    TOP_PROFILES[topTemplate] ?? TOP_PROFILES.tee,
    fit,
    { x: "topWidth", y: "topLength", z: "topDepth" },
    new THREE.Color(top?.appearance.topColor ?? outfit.topColor),
    outfit.layers.top
  );

  applyStyleToMeshes(
    bottomMeshes,
    BOTTOM_PROFILES[bottomTemplate] ?? BOTTOM_PROFILES.denim,
    fit,
    { x: "hipWidth", y: "legLength", z: "hipDepth" },
    new THREE.Color(bottom?.appearance.bottomColor ?? outfit.bottomColor),
    outfit.layers.bottom
  );

  applyStyleToMeshes(
    shoesMeshes,
    SHOES_PROFILES[shoesTemplate] ?? SHOES_PROFILES.sneaker,
    fit,
    { x: "hipWidth", y: "legLength", z: "hipDepth" },
    new THREE.Color(shoes?.appearance.accentColor ?? outfit.accentColor),
    outfit.layers.shoes
  );
}
