/**
 * Bondee Lighting Bible — RC-A A-2
 * Art Bible §② + Owner spec
 */
import { BONDEE_COLORS, hexToThree } from "./bondee-color-bible";

export const BONDEE_LIGHTING = {
  sun: {
    color: hexToThree(BONDEE_COLORS.sunWarm),
    colorHex: "#FFF5EB",
    intensity: 1.15,
    /** 좌상단 → 우하단 (월드) */
    position: [-4.5, 11, 2.5] as const,
    shadow: {
      softness: 0.45,
      mapSize: 2048,
      mobileMapSize: 1024,
      bias: -0.0002,
      radius: 3.5,
    },
  },
  ambient: {
    color: hexToThree(BONDEE_COLORS.ambientCream),
    colorHex: BONDEE_COLORS.ambientCream,
    intensity: 0.55,
  },
  hemisphere: {
    sky: hexToThree("#FFF8F0"),
    ground: hexToThree("#C9B89A"),
    intensity: 0.42,
  },
  bounce: {
    color: hexToThree(BONDEE_COLORS.floorBounce),
    colorHex: BONDEE_COLORS.floorBounce,
    intensity: 0.18,
    position: [0, -2, 0] as const,
  },
  rim: {
    color: hexToThree(BONDEE_COLORS.rimOrange),
    colorHex: BONDEE_COLORS.rimOrange,
    intensity: 0.12,
    position: [5, 4, -5] as const,
  },
  fill: {
    color: hexToThree("#E8F0FF"),
    intensity: 0.16,
    position: [5, 4, -5] as const,
  },
  fog: {
    color: hexToThree(BONDEE_COLORS.fogCream),
    colorHex: BONDEE_COLORS.fogCream,
    near: 18,
    far: 55,
  },
  renderer: {
    toneMappingExposure: 1.02,
    /** Lift +2% ≈ exposure bump */
  },
  bloom: {
    strength: 0.18,
    radius: 0.35,
    threshold: 1.15,
  },
  ssao: {
    kernelRadius: 8,
    minDistance: 0.001,
    maxDistance: 0.072,
    intensity: 0.18,
  },
} as const;
