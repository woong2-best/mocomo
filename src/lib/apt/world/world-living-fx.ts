"use client";

import * as THREE from "three";
import { getRealWorldHour } from "@/lib/apt/day-night";

type GlowEntry = { mesh: THREE.Mesh; base: number; speed: number; phase: number };
type SwayEntry = { obj: THREE.Object3D; axis: "x" | "y" | "z"; amp: number; speed: number; phase: number };
type ClockHand = { obj: THREE.Object3D; kind: "hour" | "minute" | "second" };

/** 복도·로비·건물 — 가만히 있어도 살아있는 공간 연출 */
export class WorldLivingFx {
  private doorGlows: GlowEntry[] = [];
  private gapGlows: GlowEntry[] = [];
  private windowGlows: GlowEntry[] = [];
  private elevPanels: THREE.Mesh[] = [];
  private clockHands: ClockHand[] = [];
  private sways: SwayEntry[] = [];
  private recDots: THREE.Mesh[] = [];

  scan(root: THREE.Object3D) {
    this.doorGlows = [];
    this.gapGlows = [];
    this.windowGlows = [];
    this.elevPanels = [];
    this.clockHands = [];
    this.sways = [];
    this.recDots = [];

    root.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) {
        if (obj.name === "corridor-clock") {
          obj.traverse((child) => {
            if (child.name === "clock-hour-hand") this.clockHands.push({ obj: child, kind: "hour" });
            if (child.name === "clock-minute-hand") this.clockHands.push({ obj: child, kind: "minute" });
            if (child.name === "clock-second-hand") this.clockHands.push({ obj: child, kind: "second" });
          });
        }
        return;
      }

      if (obj.name === "door-inner-glow" || obj.name === "door-gap-glow") {
        const mat = obj.material as THREE.MeshBasicMaterial;
        const list = obj.name === "door-gap-glow" ? this.gapGlows : this.doorGlows;
        list.push({
          mesh: obj,
          base: mat?.opacity ?? 0.2,
          speed: 1.4 + list.length * 0.2,
          phase: list.length * 1.1,
        });
      }
      if (obj.name === "corridor-end-window") {
        const mat = obj.material as THREE.MeshBasicMaterial;
        this.windowGlows.push({ mesh: obj, base: mat?.opacity ?? 0.22, speed: 0.9, phase: 0 });
      }
      if (obj.name === "elevator-floor-number") {
        this.elevPanels.push(obj);
      }
      if (obj.name === "plant-leaves" || obj.userData.sway) {
        this.sways.push({
          obj,
          axis: "z",
          amp: 0.035 + (this.sways.length % 3) * 0.012,
          speed: 1.1 + (this.sways.length % 4) * 0.25,
          phase: this.sways.length * 0.8,
        });
      }
      if (obj.name === "door-rec-dot") {
        this.recDots.push(obj);
      }
      if (obj instanceof THREE.Mesh && obj.parent?.name === "corridor-planter") {
        if (obj.geometry instanceof THREE.SphereGeometry) {
          this.sways.push({
            obj,
            axis: "z",
            amp: 0.05,
            speed: 1.3 + this.sways.length * 0.15,
            phase: this.sways.length,
          });
        }
      }
    });
  }

  tick(phase: number, hour: number, darkness: number): boolean {
    let anim = false;
    const night = darkness > 0.35;
    const evening = darkness > 0.15 && darkness < 0.75;

    for (const entry of this.doorGlows) {
      const mat = entry.mesh.material as THREE.MeshBasicMaterial;
      if (!mat) continue;
      const pulse = night || evening ? 1 : 0.35;
      const next = entry.base * pulse * (0.82 + Math.sin(phase * entry.speed + entry.phase) * 0.18);
      if (Math.abs(mat.opacity - next) > 0.008) {
        mat.opacity = next;
        anim = true;
      }
    }

    for (const entry of this.gapGlows) {
      const mat = entry.mesh.material as THREE.MeshBasicMaterial;
      if (!mat) continue;
      const next =
        entry.base *
        (night ? 1.35 : evening ? 0.95 : 0.5) *
        (0.75 + Math.sin(phase * entry.speed * 1.6 + entry.phase) * 0.25);
      if (Math.abs(mat.opacity - next) > 0.008) {
        mat.opacity = next;
        anim = true;
      }
    }

    for (const entry of this.windowGlows) {
      const mat = entry.mesh.material as THREE.MeshBasicMaterial;
      if (!mat) continue;
      const flicker = 0.7 + Math.sin(phase * 2.4) * 0.12 + Math.sin(phase * 7.1) * 0.08;
      const next = entry.base * (night ? 1.4 : evening ? 1.1 : 0.85) * flicker;
      if (Math.abs(mat.opacity - next) > 0.008) {
        mat.opacity = next;
        anim = true;
      }
    }

    for (const panel of this.elevPanels) {
      const mat = panel.material as THREE.MeshBasicMaterial;
      if (!mat) continue;
      const pulse = 0.88 + Math.sin(phase * 3.5) * 0.08;
      if (mat.map) {
        panel.scale.setScalar(pulse);
        anim = true;
      }
    }

    const h = getRealWorldHour();
    const sec = (h % 1) * 360;
    const min = ((h % 1) * 60 + Math.floor(h) * 60) % 60;
    const hr = (Math.floor(h) % 12) + min / 60;
    for (const hand of this.clockHands) {
      const target =
        hand.kind === "second"
          ? (-sec * Math.PI) / 180
          : hand.kind === "minute"
            ? (-min * Math.PI) / 30
            : (-hr * Math.PI) / 6;
      if (Math.abs(hand.obj.rotation.z - target) > 0.002) {
        hand.obj.rotation.z = THREE.MathUtils.lerp(hand.obj.rotation.z, target, 0.35);
        anim = true;
      }
    }

    for (const sway of this.sways) {
      const v = Math.sin(phase * sway.speed + sway.phase) * sway.amp;
      if (sway.axis === "z") sway.obj.rotation.z = v;
      else if (sway.axis === "y") sway.obj.rotation.y = v;
      else sway.obj.rotation.x = v;
      anim = true;
    }

    for (let i = 0; i < this.recDots.length; i++) {
      const dot = this.recDots[i];
      const mat = dot.material as THREE.MeshStandardMaterial;
      if (!mat) continue;
      const on = Math.sin(phase * 4.2 + i) > 0.15;
      mat.emissiveIntensity = on ? 0.65 + Math.sin(phase * 8) * 0.2 : 0.08;
      anim = true;
    }

    return anim;
  }

  dispose() {
    this.doorGlows = [];
    this.gapGlows = [];
    this.windowGlows = [];
    this.elevPanels = [];
    this.clockHands = [];
    this.sways = [];
    this.recDots = [];
  }
}
