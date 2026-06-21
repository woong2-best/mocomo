"use client";

import * as THREE from "three";
import type { DayNightLighting } from "@/lib/apt/day-night";
import { APT_ART, aptGlowMat } from "./apt-world-art";

/** 복도 전용 조명 — 천장 스pot + 벽 washer, 낮/밤 연동 */
export class CorridorEnvironment {
  readonly root = new THREE.Group();
  private spots: THREE.SpotLight[] = [];
  private washers: THREE.PointLight[] = [];
  private emissiveFixtures: THREE.Mesh[] = [];
  private endWindow: THREE.Mesh | null = null;

  build(len: number, width: number, height: number) {
    this.dispose();
    this.root.name = "corridor-environment";

    const spotCount = Math.max(5, Math.floor(len / 1.4));
    for (let i = 0; i < spotCount; i++) {
      const x = -len / 2 + 0.6 + (i / (spotCount - 1)) * (len - 1.2);
      const spot = new THREE.SpotLight(APT_ART.lightWarm, 0.82, 8, Math.PI / 4.5, 0.32, 1.1);
      spot.position.set(x, height - 0.08, 0);
      spot.target.position.set(x, 0, 0);
      this.root.add(spot);
      this.root.add(spot.target);
      this.spots.push(spot);

      const fixture = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.18, 0.04, 12),
        aptGlowMat(APT_ART.lightWarm, 0.28)
      );
      fixture.rotation.x = Math.PI / 2;
      fixture.position.set(x, height - 0.1, 0);
      fixture.name = "corridor-light-fixture";
      this.root.add(fixture);
      this.emissiveFixtures.push(fixture);
    }

    const wash = new THREE.PointLight(APT_ART.lightWarm, 0.38, 8, 1.4);
    wash.position.set(len / 2 - 0.8, height * 0.55, -width / 2 + 0.15);
    this.root.add(wash);
    this.washers.push(wash);

    const elevWash = new THREE.PointLight(APT_ART.signWarm, 0.42, 5, 1.3);
    elevWash.position.set(-len / 2 + 0.9, height * 0.45, 0);
    this.root.add(elevWash);
    this.washers.push(elevWash);

    this.endWindow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, height * 0.55),
      new THREE.MeshBasicMaterial({
        color: APT_ART.lightCool,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
      })
    );
    this.endWindow.position.set(len / 2 - 0.08, height * 0.48, 0);
    this.endWindow.rotation.y = -Math.PI / 2;
    this.endWindow.name = "corridor-end-window";
    this.root.add(this.endWindow);

    for (let i = 0; i < spotCount; i++) {
      const x = -len / 2 + 0.6 + (i / (spotCount - 1)) * (len - 1.2);
      const shadow = new THREE.Mesh(
        new THREE.CircleGeometry(0.38, 16),
        new THREE.MeshBasicMaterial({
          color: APT_ART.shadow,
          transparent: true,
          opacity: 0.08,
          depthWrite: false,
        })
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.set(x, 0.028, 0);
      shadow.name = "corridor-light-shadow";
      this.root.add(shadow);
    }
  }

  applyDayNight(lighting: DayNightLighting) {
    const warm = 1 - lighting.darkness * 0.75;
    const nightBoost = lighting.darkness * 0.85 + lighting.windowGlow * 0.35;
    for (const s of this.spots) {
      s.intensity = 0.15 * warm + 0.65 * nightBoost;
      s.color.setHex(lighting.darkness > 0.35 ? APT_ART.lightWarm : APT_ART.lightWarm);
    }
    for (const w of this.washers) {
      w.intensity = 0.08 * warm + 0.28 * nightBoost;
    }
    for (const f of this.emissiveFixtures) {
      const mat = f.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.08 * warm + 0.35 * nightBoost;
    }
    if (this.endWindow) {
      const mat = this.endWindow.material as THREE.MeshBasicMaterial;
      mat.opacity = (lighting.darkness > 0.4 ? 0.08 : 0.22 + (1 - lighting.darkness) * 0.12) * (0.85 + lighting.windowGlow * 0.4);
      mat.color.setHex(lighting.darkness > 0.5 ? 0x6688aa : lighting.warmth > 0.5 ? 0xffcc88 : APT_ART.lightCool);
    }
    this.root.traverse((obj) => {
      if (obj.name === "corridor-light-shadow" && obj instanceof THREE.Mesh) {
        const mat = obj.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.04 + lighting.darkness * 0.06;
      }
    });
  }

  tick(phase: number): boolean {
    let anim = false;
    for (let i = 0; i < this.emissiveFixtures.length; i++) {
      const f = this.emissiveFixtures[i];
      const mat = f.material as THREE.MeshStandardMaterial;
      const base = mat.emissiveIntensity;
      const next = base + Math.sin(phase * 2.1 + i * 0.7) * 0.015;
      if (Math.abs(next - base) > 0.002) {
        mat.emissiveIntensity = next;
        anim = true;
      }
    }
    return anim;
  }

  dispose() {
    for (const s of this.spots) {
      this.root.remove(s.target);
    }
    this.spots = [];
    this.washers = [];
    this.emissiveFixtures = [];
    this.endWindow = null;
    while (this.root.children.length) this.root.remove(this.root.children[0]);
  }
}
