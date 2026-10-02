"use client";

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

/** 건물 외벽 창문 InstancedMesh — draw call 최소화 */
export function buildInstancedWindowLights(
  positions: THREE.Vector3[],
  maxCount = 512
): THREE.InstancedMesh | null {
  const count = Math.min(positions.length, maxCount);
  if (count === 0) return null;

  const geo = new RoundedBoxGeometry(0.04, 0.22, 0.16, 2, 0.01);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xfff0c8,
    emissive: new THREE.Color(0xffe8a0),
    emissiveIntensity: 0.35,
    transparent: true,
    opacity: 0.55,
    roughness: 0.2,
    metalness: 0.05,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.name = "instanced-window-lights";
  mesh.frustumCulled = true;

  const m = new THREE.Matrix4();
  for (let i = 0; i < count; i++) {
    m.makeTranslation(positions[i].x, positions[i].y, positions[i].z);
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

/** shell/units에서 exterior-window 위치 수집 */
export function collectWindowPositions(root: THREE.Object3D): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  const v = new THREE.Vector3();
  root.traverse((obj) => {
    if (obj.name === "exterior-window" && obj instanceof THREE.Mesh) {
      obj.getWorldPosition(v);
      out.push(v.clone());
    }
  });
  return out;
}

/** 야간 창문 emissive 펄스 */
export function tickWindowLights(
  mesh: THREE.InstancedMesh | null,
  phase: number,
  night: boolean
): boolean {
  if (!mesh) return false;
  const mat = mesh.material as THREE.MeshStandardMaterial;
  if (!mat) return false;
  const target = night ? 0.28 + Math.sin(phase * 1.7) * 0.12 : 0.08;
  if (Math.abs(mat.emissiveIntensity - target) > 0.01) {
    mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, target, 0.08);
    return true;
  }
  return false;
}
