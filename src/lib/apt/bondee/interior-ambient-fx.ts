"use client";

import * as THREE from "three";

type TvEntry = { mesh: THREE.Mesh; baseEmissive: number };
type LampEntry = { mesh: THREE.Mesh; on: boolean };

/** Animal Crossing 스타일 — TV·램프·식물 미세 애니메이션 */
export class InteriorAmbientFx {
  private tvs: TvEntry[] = [];
  private lamps: LampEntry[] = [];
  private plants: THREE.Mesh[] = [];

  scan(root: THREE.Object3D, lightsOn: Record<string, boolean> | undefined) {
    this.tvs = [];
    this.lamps = [];
    this.plants = [];
    root.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (obj.name === "console-screen" || obj.userData.isConsoleScreen) {
        const mat = obj.material as THREE.MeshStandardMaterial;
        this.tvs.push({ mesh: obj, baseEmissive: mat?.emissiveIntensity ?? 0.5 });
      }
      if (obj.name === "lamp-shade" || obj.name === "floor-lamp-glow") {
        const id = obj.userData.placedId as string | undefined;
        this.lamps.push({ mesh: obj, on: id ? !!lightsOn?.[id] : false });
      }
      if (obj.name === "plant-leaves") {
        this.plants.push(obj);
      }
    });
  }

  tick(phase: number, lightsOn: Record<string, boolean> | undefined): boolean {
    let anim = false;
    for (const tv of this.tvs) {
      const mat = tv.mesh.material as THREE.MeshStandardMaterial;
      if (!mat?.emissive) continue;
      const flicker = 0.85 + Math.sin(phase * 22) * 0.08 + Math.sin(phase * 7.3) * 0.05;
      const next = tv.baseEmissive * flicker;
      if (Math.abs(mat.emissiveIntensity - next) > 0.02) {
        mat.emissiveIntensity = next;
        anim = true;
      }
    }
    for (const lamp of this.lamps) {
      const id = lamp.mesh.userData.placedId as string | undefined;
      lamp.on = id ? !!lightsOn?.[id] : lamp.on;
      const mat = lamp.mesh.material as THREE.MeshStandardMaterial;
      if (!mat?.emissive) continue;
      const target = lamp.on ? 0.55 + Math.sin(phase * 3.2) * 0.08 : 0.05;
      mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, target, 0.1);
      anim = true;
    }
    for (let i = 0; i < this.plants.length; i++) {
      const leaf = this.plants[i];
      leaf.rotation.z = Math.sin(phase * 1.4 + i * 0.7) * 0.04;
      anim = true;
    }
    return anim;
  }

  dispose() {
    this.tvs = [];
    this.lamps = [];
    this.plants = [];
  }
}
