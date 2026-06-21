"use client";

import * as THREE from "three";
import type { DayNightLighting } from "@/lib/apt/day-night";

type GlowMesh = { mesh: THREE.Mesh; base: number; speed: number; phase: number };

/** Hero Scene 애니메이션 — 분수·네온·전광판·창문·경로 조명 */
export class HeroSceneFx {
  private fountainWater: THREE.Mesh[] = [];
  private fountainJet: THREE.Mesh[] = [];
  private neonSigns: THREE.Mesh[] = [];
  private tvWindows: GlowMesh[] = [];
  private pathLamps: THREE.Object3D[] = [];
  private pathStrips: THREE.Object3D[] = [];
  private sculptureOrbs: THREE.Mesh[] = [];
  private beacons: THREE.Mesh[] = [];
  private billboard: THREE.Mesh | null = null;

  scan(root: THREE.Object3D) {
    this.fountainWater = [];
    this.fountainJet = [];
    this.neonSigns = [];
    this.tvWindows = [];
    this.pathLamps = [];
    this.pathStrips = [];
    this.sculptureOrbs = [];
    this.beacons = [];
    this.billboard = null;

    root.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (obj.name === "hero-fountain-water") this.fountainWater.push(obj);
      if (obj.name === "hero-fountain-jet") this.fountainJet.push(obj);
      if (obj.name === "hero-neon-sign" || obj.name === "hero-arch-neon") this.neonSigns.push(obj);
      if (obj.name === "hero-window-tv") {
        const mat = obj.material as THREE.MeshBasicMaterial;
        this.tvWindows.push({
          mesh: obj,
          base: mat?.opacity ?? 0.5,
          speed: 2.5 + ((obj.userData.phase as number | undefined) ?? 0),
          phase: (obj.userData.phase as number | undefined) ?? 0,
        });
      }
      if (obj.name === "hero-path-lamp-glow") {
        const mat = obj.material as THREE.MeshStandardMaterial;
        this.pathLamps.push(obj);
        void mat;
      }
      if (obj.name === "hero-lobby-path-strip") this.pathStrips.push(obj);
      if (obj.name === "hero-sculpture-orb") this.sculptureOrbs.push(obj);
      if (obj.name === "hero-spire-beacon" || obj.name === "hero-elevator-beacon") this.beacons.push(obj);
      if (obj.name === "hero-lobby-billboard") this.billboard = obj;
    });
  }

  tick(phase: number, lighting: DayNightLighting): boolean {
    let anim = false;
    const night = lighting.darkness > 0.3;

    for (const w of this.fountainWater) {
      const mat = w.material as THREE.MeshStandardMaterial;
      if (!mat) continue;
      const next = 0.18 + Math.sin(phase * 2.2) * 0.08;
      if (Math.abs(mat.emissiveIntensity - next) > 0.01) {
        mat.emissiveIntensity = next;
        anim = true;
      }
    }
    for (const j of this.fountainJet) {
      j.position.y = 0.52 + Math.sin(phase * 3.8) * 0.06;
      j.scale.y = 0.85 + Math.sin(phase * 4.2) * 0.15;
      anim = true;
    }

    for (let i = 0; i < this.neonSigns.length; i++) {
      const mat = this.neonSigns[i].material as THREE.MeshBasicMaterial;
      if (!mat) continue;
      const pulse = night ? 0.92 + Math.sin(phase * 2.8 + i) * 0.08 : 0.75 + Math.sin(phase * 1.5 + i) * 0.05;
      mat.opacity = pulse;
      anim = true;
    }

    for (const tv of this.tvWindows) {
      const mat = tv.mesh.material as THREE.MeshBasicMaterial;
      const flicker = tv.base * (0.7 + Math.sin(phase * tv.speed + tv.phase) * 0.25);
      if (Math.abs(mat.opacity - flicker) > 0.01) {
        mat.opacity = flicker;
        anim = true;
      }
    }

    this.pathLamps.forEach((glow, i) => {
      const mat = (glow as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (!mat?.emissive) return;
      mat.emissiveIntensity = (night ? 0.45 : 0.22) + Math.sin(phase * 1.8 - i * 0.4) * 0.12;
      anim = true;
    });

    this.pathStrips.forEach((strip, i) => {
      const mat = (strip as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (!mat?.emissive) return;
      const wave = Math.sin(phase * 2.4 - i * 0.55);
      mat.emissiveIntensity = 0.15 + (wave > 0 ? wave : 0) * 0.35;
      anim = true;
    });

    this.sculptureOrbs.forEach((orb, i) => {
      orb.position.y = 0.35 + i * 0.22 + Math.sin(phase * 0.9 + i * 0.7) * 0.025;
      orb.rotation.y = phase * 0.15 + i;
      anim = true;
    });

    for (const b of this.beacons) {
      const mat = b.material as THREE.MeshStandardMaterial;
      if (!mat?.emissive) continue;
      mat.emissiveIntensity = (night ? 0.75 : 0.35) + Math.sin(phase * 3.2) * 0.2;
      anim = true;
    }

    if (this.billboard) {
      this.billboard.rotation.y = Math.sin(phase * 0.15) * 0.015;
      anim = true;
    }

    return anim;
  }

  dispose() {
    this.fountainWater = [];
    this.fountainJet = [];
    this.neonSigns = [];
    this.tvWindows = [];
    this.pathLamps = [];
    this.pathStrips = [];
    this.sculptureOrbs = [];
    this.beacons = [];
    this.billboard = null;
  }
}
