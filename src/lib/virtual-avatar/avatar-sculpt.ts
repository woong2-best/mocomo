import * as THREE from "three";
import type { VRM } from "@pixiv/three-vrm";
import type { AvatarSculptParams, SculptDelta } from "@/lib/virtual-avatar/types";

function getFaceMesh(vrm: VRM): THREE.Mesh | null {
  let found: THREE.Mesh | null = null;
  vrm.scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (found || !mesh.isMesh) return;
    const n = mesh.name.toLowerCase();
    if (n.includes("face") && !n.includes("hair")) found = mesh;
  });
  return found;
}

export class AvatarSculptSession {
  private basePositions: Float32Array | null = null;
  private mesh: THREE.Mesh | null = null;
  private cacheKey = "";

  bind(vrm: VRM) {
    const mesh = getFaceMesh(vrm);
    if (!mesh || !mesh.geometry) return;
    if (this.mesh === mesh) return;

    this.mesh = mesh;
    const geo = mesh.geometry.clone();
    mesh.geometry = geo;
    const pos = geo.attributes.position;
    this.basePositions = new Float32Array(pos.array.length);
    this.basePositions.set(pos.array as Float32Array);
    this.cacheKey = "";
  }

  apply(vrm: VRM, sculpt: AvatarSculptParams) {
    if (!sculpt.enabled && sculpt.deltas.length === 0) return;
    this.bind(vrm);
    if (!this.mesh || !this.basePositions) return;

    const key = JSON.stringify(sculpt.deltas);
    if (key === this.cacheKey) return;
    this.cacheKey = key;

    const geo = this.mesh.geometry;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    pos.array.set(this.basePositions);

    sculpt.deltas.forEach((d) => this.applyDelta(pos, d));
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }

  pushDelta(sculpt: AvatarSculptParams, delta: SculptDelta, max = 800): AvatarSculptParams {
    const deltas = [...sculpt.deltas, delta];
    if (deltas.length > max) deltas.splice(0, deltas.length - max);
    return { ...sculpt, deltas };
  }

  clear(vrm: VRM) {
    this.bind(vrm);
    if (!this.mesh || !this.basePositions) return;
    this.mesh.geometry.attributes.position.array.set(this.basePositions);
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
    this.cacheKey = "";
  }

  private applyDelta(pos: THREE.BufferAttribute, d: SculptDelta) {
    const i = d.vi * 3;
    if (i < 0 || i + 2 >= pos.array.length) return;
    pos.array[i] += d.dx;
    pos.array[i + 1] += d.dy;
    pos.array[i + 2] += d.dz;
  }

  sculptAt(vrm: VRM, point: THREE.Vector3, normal: THREE.Vector3, sculpt: AvatarSculptParams): AvatarSculptParams | null {
    this.bind(vrm);
    if (!this.mesh) return null;

    const pos = this.mesh.geometry.attributes.position as THREE.BufferAttribute;
    const radius = sculpt.brushRadius;
    const strength = sculpt.brushStrength;
    let closest = -1;
    let closestDist = radius;

    for (let vi = 0; vi < pos.count; vi++) {
      const vx = pos.getX(vi);
      const vy = pos.getY(vi);
      const vz = pos.getZ(vi);
      const wp = new THREE.Vector3(vx, vy, vz).applyMatrix4(this.mesh.matrixWorld);
      const dist = wp.distanceTo(point);
      if (dist < closestDist) {
        closestDist = dist;
        closest = vi;
      }
    }

    if (closest < 0) return null;
    const falloff = 1 - closestDist / radius;
    return this.pushDelta(sculpt, {
      vi: closest,
      dx: normal.x * strength * falloff,
      dy: normal.y * strength * falloff,
      dz: normal.z * strength * falloff,
    });
  }
}

export const avatarSculptSession = new AvatarSculptSession();
