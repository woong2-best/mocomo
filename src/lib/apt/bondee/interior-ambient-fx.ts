"use client";

import * as THREE from "three";

type TvEntry = { mesh: THREE.Mesh; baseEmissive: number };
type LampEntry = { mesh: THREE.Mesh; on: boolean };

/** TV·램프·식물·시계·세탁기 미세 애니메이션 */
export class InteriorAmbientFx {
  private tvs: TvEntry[] = [];
  private lamps: LampEntry[] = [];
  private plants: THREE.Mesh[] = [];
  private clockHands: THREE.Object3D[] = [];
  private washerDrums: THREE.Mesh[] = [];
  private curtains: THREE.Mesh[] = [];

  scan(root: THREE.Object3D, lightsOn: Record<string, boolean> | undefined, furnitureOpen?: Record<string, boolean>) {
    this.tvs = [];
    this.lamps = [];
    this.plants = [];
    this.clockHands = [];
    this.washerDrums = [];
    this.curtains = [];
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
      if (obj.name === "plant-leaves") this.plants.push(obj);
      if (obj.name === "clock-hour-hand" || obj.name === "clock-minute-hand") this.clockHands.push(obj);
      if (obj.name === "washer-drum") {
        const pid = (obj.parent?.userData.placedId ?? obj.userData.placedId) as string | undefined;
        if (pid) obj.userData.placedId = pid;
        this.washerDrums.push(obj);
      }
      if (obj.name === "room-curtain") this.curtains.push(obj);
    });
  }

  tick(phase: number, lightsOn: Record<string, boolean> | undefined, furnitureOpen?: Record<string, boolean>): boolean {
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
      this.plants[i].rotation.z = Math.sin(phase * 1.4 + i * 0.7) * 0.04;
      anim = true;
    }
    for (const hand of this.clockHands) {
      const speed = hand.name === "clock-minute-hand" ? 0.35 : 0.03;
      hand.rotation.z = -phase * speed;
      anim = true;
    }
    for (const drum of this.washerDrums) {
      const id = drum.userData.placedId as string | undefined;
      const spin = id ? !!furnitureOpen?.[id] : false;
      if (spin) {
        drum.rotation.z += 0.08;
        anim = true;
      }
    }
    for (let i = 0; i < this.curtains.length; i++) {
      this.curtains[i].rotation.y = Math.sin(phase * 0.6 + i) * 0.06;
      anim = true;
    }
    return anim;
  }

  dispose() {
    this.tvs = [];
    this.lamps = [];
    this.plants = [];
    this.clockHands = [];
    this.washerDrums = [];
    this.curtains = [];
  }
}
