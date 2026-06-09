import * as THREE from "three";
import type { VRM } from "@pixiv/three-vrm";
import type { AvatarConfig } from "@/lib/virtual-avatar/types";
import { setSolidClothingColor } from "@/lib/virtual-avatar/material-utils";

const CLOTHING = {
  top: ["Tops_01", "Tops_01_CLOTH"],
  bottom: ["Bottoms_01", "Bottoms_01_CLOTH"],
  shoes: ["Shoes_01", "Shoes_01_CLOTH"],
} as const;

type Slot = keyof typeof CLOTHING;

const SLOT_MATERIAL: Record<Slot, { roughness: number; metalness?: number }> = {
  top: { roughness: 0.68 },
  bottom: { roughness: 0.7 },
  shoes: { roughness: 0.52, metalness: 0.04 },
};

const originalTransforms = new WeakMap<THREE.Object3D, { scale: THREE.Vector3; position: THREE.Vector3 }>();

function matchesMesh(name: string, keys: readonly string[]): boolean {
  return keys.some((key) => name === key || name.startsWith(`${key}_`));
}

function findMeshes(vrm: VRM, keys: readonly string[]): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  vrm.scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (matchesMesh(mesh.name, keys)) meshes.push(mesh);
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

function resetTransform(mesh: THREE.Mesh) {
  const orig = originalTransforms.get(mesh);
  if (orig) {
    mesh.scale.copy(orig.scale);
    mesh.position.copy(orig.position);
  } else {
    mesh.scale.set(1, 1, 1);
    mesh.position.set(0, 0, 0);
  }
}

function paintMeshes(meshes: THREE.Mesh[], color: THREE.Color, slot: Slot, visible: boolean) {
  const matOpts = SLOT_MATERIAL[slot];
  for (const mesh of meshes) {
    rememberTransform(mesh);
    resetTransform(mesh);
    mesh.visible = visible;
    if (!visible) continue;

    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((mat) => {
      setSolidClothingColor(mat, color, matOpts);
    });
  }
}

/** VRM 기본 상의·하의·신발 — 스케일 변경 없이 색·표시만 (뼈 스킨ning으로 체형에 밀착) */
export function applyNativeClothing(vrm: VRM, config: AvatarConfig) {
  const { outfit } = config;

  paintMeshes(
    findMeshes(vrm, CLOTHING.top),
    new THREE.Color(outfit.topColor),
    "top",
    outfit.layers.top
  );
  paintMeshes(
    findMeshes(vrm, CLOTHING.bottom),
    new THREE.Color(outfit.bottomColor),
    "bottom",
    outfit.layers.bottom
  );
  paintMeshes(
    findMeshes(vrm, CLOTHING.shoes),
    new THREE.Color(outfit.accentColor),
    "shoes",
    outfit.layers.shoes
  );
}
