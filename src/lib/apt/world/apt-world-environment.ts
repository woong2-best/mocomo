"use client";

import * as THREE from "three";
import type { DayNightLighting } from "@/lib/apt/day-night";

/** 복도·로비 조명 — 시간대별 밝기 */
export function updateCorridorAmbientLights(root: THREE.Object3D, darkness: number) {
  const night = Math.max(0, Math.min(1, darkness));
  root.traverse((obj) => {
    if (obj.name === "corridor-ceiling-lights-instanced" && obj instanceof THREE.InstancedMesh) {
      const mat = obj.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.45 + night * 0.45;
      mat.color.setHex(night > 0.35 ? 0xfff0c8 : 0xfff4d8);
    }
    if (obj.name === "corridor-ceiling-light" && obj instanceof THREE.Mesh) {
      const mat = obj.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.45 + night * 0.45;
    }
  });
}

/** 단지 메가타워 창문 — 야간 emissive */
export function updateDistrictWindowPulse(
  winMat: THREE.MeshStandardMaterial,
  phase: number,
  darkness: number
) {
  const night = Math.max(0, Math.min(1, darkness));
  const pulse = 0.16 + Math.sin(phase * 1.3) * 0.05 + night * 0.22;
  winMat.emissiveIntensity = pulse;
}

export function skyTintForLighting(lighting: DayNightLighting) {
  return lighting.skyColor;
}
