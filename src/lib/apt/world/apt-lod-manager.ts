"use client";

import * as THREE from "three";
import { LOD_DIST_FULL, LOD_DIST_OPAQUE, LOD_DIST_SHELL } from "@/lib/apt/bondee/scene-perf";

export { LOD_DIST_FULL, LOD_DIST_OPAQUE, LOD_DIST_SHELL };

export function createLodGroup(levels: { mesh: THREE.Object3D; distance: number }[]): THREE.LOD {
  const lod = new THREE.LOD();
  for (const lv of [...levels].sort((a, b) => a.distance - b.distance)) {
    lod.addLevel(lv.mesh, lv.distance);
  }
  return lod;
}

export function cullGroupByDistance(group: THREE.Object3D, camera: THREE.Camera, maxDist: number) {
  const camPos = new THREE.Vector3();
  camera.getWorldPosition(camPos);
  group.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh) && !(obj instanceof THREE.InstancedMesh)) return;
    const pos = new THREE.Vector3();
    obj.getWorldPosition(pos);
    obj.visible = camPos.distanceTo(pos) <= maxDist;
  });
}

/** THREE.LOD + frustum cull + GPU occlusion (벽 fade) */
export class AptWorldPerfManager {
  private lods = new Set<THREE.LOD>();
  private cullRoots = new Set<THREE.Object3D>();
  private occluders: THREE.Mesh[] = [];
  private frustum = new THREE.Frustum();
  private projScreen = new THREE.Matrix4();
  private camPos = new THREE.Vector3();
  private focal = new THREE.Vector3();
  private toCam = new THREE.Vector3();
  private toWall = new THREE.Vector3();
  private wallPos = new THREE.Vector3();
  private projPoint = new THREE.Vector3();

  registerLod(lod: THREE.LOD) {
    this.lods.add(lod);
  }

  registerCullRoot(root: THREE.Object3D) {
    this.cullRoots.add(root);
  }

  unregisterCullRoot(root: THREE.Object3D) {
    this.cullRoots.delete(root);
  }

  collectOccluders(root: THREE.Object3D) {
    this.occluders = [];
    root.traverse((obj) => {
      if (obj instanceof THREE.Mesh && (obj.userData.isHomeWall || obj.userData.isOccluder)) {
        this.occluders.push(obj);
      }
    });
  }

  tick(camera: THREE.Camera, focalPoint: THREE.Vector3, dt: number): boolean {
    let moved = false;
    camera.getWorldPosition(this.camPos);

    for (const lod of this.lods) {
      lod.update(camera);
      moved = true;
    }

    this.projScreen.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.projScreen);

    for (const root of this.cullRoots) {
      root.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh) && !(obj instanceof THREE.InstancedMesh)) return;
        if (obj.geometry.boundingSphere === null) obj.geometry.computeBoundingSphere();
        const visible = this.frustum.intersectsObject(obj);
        if (obj.visible !== visible) {
          obj.visible = visible;
          moved = true;
        }
      });
    }

    this.focal.copy(focalPoint);
    moved = this.updateGpuOcclusion(camera, dt) || moved;
    return moved;
  }

  private updateGpuOcclusion(camera: THREE.Camera, dt: number): boolean {
    if (!this.occluders.length) return false;
    let changed = false;
    this.camPos.copy(camera.position);
    this.toCam.subVectors(this.camPos, this.focal);
    const camLenSq = this.toCam.lengthSq();
    const camLen = camLenSq < 1e-4 ? 0 : Math.sqrt(camLenSq);

    for (const mesh of this.occluders) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (!mat || !("opacity" in mat)) continue;

      const base = (mesh.userData.baseOpacity as number) ?? mat.opacity;
      const occlude = (mesh.userData.occludeOpacity as number) ?? 0.58;
      let target = base;

      if (camLen > 0.02) {
        mesh.getWorldPosition(this.wallPos);
        this.toWall.subVectors(this.wallPos, this.focal);
        const wallDist = this.toWall.length();
        const t = this.toWall.dot(this.toCam) / camLenSq;
        if (t > 0.05 && t < 0.92 && wallDist < camLen * 0.95) {
          this.projPoint.copy(this.focal).addScaledVector(this.toCam, t);
          if (this.wallPos.distanceTo(this.projPoint) < 0.65) target = occlude;
        }
      }

      const next = THREE.MathUtils.lerp(mat.opacity, target, Math.min(1, 12 * dt));
      if (Math.abs(next - mat.opacity) > 0.004) {
        mat.opacity = next;
        mat.transparent = next < 0.98;
        mat.depthWrite = next > 0.5;
        mat.needsUpdate = true;
        changed = true;
      }
    }
    return changed;
  }

  dispose() {
    this.lods.clear();
    this.cullRoots.clear();
    this.occluders = [];
  }
}
