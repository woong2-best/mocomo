/**
 * Bondee Material Bible — RC-A A-2
 * Soft Toy Material: rounded · low specular · soft AO · warm tint
 */
import * as THREE from "three";
import { hexToThree, BONDEE_COLORS } from "./bondee-color-bible";

export type BondeeMaterialKind =
  | "fabric"
  | "wood"
  | "plastic"
  | "metal"
  | "wall"
  | "floor"
  | "glass";

export const BONDEE_MATERIAL = {
  fabric: {
    roughness: 0.82,
    metalness: 0,
    /** MeshPhysicalMaterial sheen when available */
    sheen: 0.28,
    sheenRoughness: 0.85,
    color: hexToThree(BONDEE_COLORS.softPink),
  },
  wood: {
    roughness: 0.72,
    metalness: 0,
    color: hexToThree(BONDEE_COLORS.warmWood),
  },
  plastic: {
    roughness: 0.88,
    metalness: 0,
    color: hexToThree(BONDEE_COLORS.cream),
  },
  metal: {
    roughness: 0.55,
    metalness: 0.65,
    color: hexToThree("#C8A878"),
  },
  wall: {
    roughness: 0.88,
    metalness: 0,
    color: hexToThree(BONDEE_COLORS.cream),
  },
  floor: {
    roughness: 0.68,
    metalness: 0,
    color: hexToThree(BONDEE_COLORS.warmBeige),
  },
  glass: {
    roughness: 0.08,
    metalness: 0.05,
    color: hexToThree("#FFFFFF"),
    transparent: true,
    opacity: 0.25,
  },
} as const;

export function createBondeeMaterial(
  kind: BondeeMaterialKind,
  overrides?: Partial<THREE.MeshStandardMaterialParameters>
): THREE.MeshStandardMaterial {
  const preset = BONDEE_MATERIAL[kind];
  return new THREE.MeshStandardMaterial({
    color: preset.color,
    roughness: preset.roughness,
    metalness: preset.metalness,
    ...("transparent" in preset && preset.transparent
      ? { transparent: true, opacity: preset.opacity }
      : {}),
    ...overrides,
  });
}

/** bondeeMat() 호환 — 기본값을 Bible로 통일 */
export function bondeeMaterialParams(
  color: number | string,
  kind: BondeeMaterialKind = "plastic",
  opts?: Partial<THREE.MeshStandardMaterialParameters>
): THREE.MeshStandardMaterialParameters {
  const preset = BONDEE_MATERIAL[kind];
  return {
    color,
    roughness: preset.roughness,
    metalness: preset.metalness,
    ...opts,
  };
}
