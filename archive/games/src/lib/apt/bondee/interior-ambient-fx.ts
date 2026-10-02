"use client";

import * as THREE from "three";
import { getRealWorldHour } from "@/lib/apt/day-night";

type TvEntry = { mesh: THREE.Mesh; baseEmissive: number; hue: number };
type LampEntry = { mesh: THREE.Mesh; on: boolean };
type GlowEntry = { mesh: THREE.Mesh; base: number; speed: number; phase: number };
type SwayEntry = { obj: THREE.Object3D; axis: "x" | "y" | "z"; amp: number; speed: number; phase: number };
type ClockHand = { obj: THREE.Object3D; kind: "hour" | "minute" | "second" };

/** 실내 생동감 — TV·창문·커튼·식물·시계·천장 조명 (Animal Crossing 감성) */
export class InteriorAmbientFx {
  private tvs: TvEntry[] = [];
  private lamps: LampEntry[] = [];
  private windowGlows: GlowEntry[] = [];
  private ceilingLights: GlowEntry[] = [];
  private sways: SwayEntry[] = [];
  private clockHands: ClockHand[] = [];
  private washerDrums: THREE.Mesh[] = [];
  private darkness = 0;

  scan(root: THREE.Object3D, lightsOn: Record<string, boolean> | undefined, _furnitureOpen?: Record<string, boolean>) {
    this.tvs = [];
    this.lamps = [];
    this.windowGlows = [];
    this.ceilingLights = [];
    this.sways = [];
    this.clockHands = [];
    this.washerDrums = [];

    root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (obj.name === "console-screen" || obj.userData.isConsoleScreen) {
          const mat = obj.material as THREE.MeshStandardMaterial;
          this.tvs.push({ mesh: obj, baseEmissive: mat?.emissiveIntensity ?? 0.5, hue: 0.58 });
        }
        if (obj.name === "window-sun-glow" || obj.name === "tv-wall-glow") {
          const mat = obj.material as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;
          this.windowGlows.push({
            mesh: obj,
            base: "emissiveIntensity" in mat ? (mat.emissiveIntensity ?? 0.3) : (mat.opacity ?? 0.3),
            speed: 1.2 + this.windowGlows.length * 0.3,
            phase: this.windowGlows.length,
          });
        }
        if (obj.name === "room-ceiling-light") {
          const mat = obj.material as THREE.MeshBasicMaterial;
          this.ceilingLights.push({
            mesh: obj,
            base: mat?.opacity ?? 0.65,
            speed: 2.5,
            phase: 0,
          });
        }
        if (obj.name === "lamp-shade" || obj.name === "floor-lamp-glow") {
          const id = obj.userData.placedId as string | undefined;
          this.lamps.push({ mesh: obj, on: id ? !!lightsOn?.[id] : false });
        }
        if (obj.name === "washer-drum") {
          const pid = (obj.parent?.userData.placedId ?? obj.userData.placedId) as string | undefined;
          if (pid) obj.userData.placedId = pid;
          this.washerDrums.push(obj);
        }
      }

      if (obj.name === "plant-leaves" || obj.name === "room-curtain") {
        this.sways.push({
          obj,
          axis: obj.name === "room-curtain" ? "y" : "z",
          amp: obj.name === "room-curtain" ? 0.045 : 0.038,
          speed: obj.name === "room-curtain" ? 0.55 : 1.35,
          phase: this.sways.length * 0.9,
        });
      }
      if (obj.name === "clock-hour-hand") this.clockHands.push({ obj, kind: "hour" });
      if (obj.name === "clock-minute-hand") this.clockHands.push({ obj, kind: "minute" });
      if (obj.name === "clock-second-hand") this.clockHands.push({ obj, kind: "second" });
    });
  }

  setDarkness(darkness: number) {
    this.darkness = darkness;
  }

  tick(
    phase: number,
    lightsOn: Record<string, boolean> | undefined,
    furnitureOpen?: Record<string, boolean>
  ): boolean {
    let anim = false;
    const night = this.darkness > 0.35;
    const evening = this.darkness > 0.12;

    for (const tv of this.tvs) {
      const mat = tv.mesh.material as THREE.MeshStandardMaterial;
      if (!mat?.emissive) continue;
      const contentShift = 0.9 + Math.sin(phase * 18 + tv.hue) * 0.12 + Math.sin(phase * 5.7) * 0.06;
      const nightBoost = night ? 1.45 : evening ? 1.1 : 0.75;
      const next = tv.baseEmissive * contentShift * nightBoost;
      if (Math.abs(mat.emissiveIntensity - next) > 0.015) {
        mat.emissiveIntensity = next;
        anim = true;
      }
      if (night) {
        const tint = 0.55 + Math.sin(phase * 3.1) * 0.08;
        mat.emissive.setHSL(tint, 0.35, 0.55);
      }
    }

    for (const glow of this.windowGlows) {
      const mat = glow.mesh.material;
      const flicker = 0.78 + Math.sin(phase * glow.speed * 2.2 + glow.phase) * 0.14 + Math.sin(phase * 6.8) * 0.06;
      const boost = night ? 1.5 : evening ? 1.25 : 1;
      if (mat instanceof THREE.MeshStandardMaterial && mat.emissive) {
        const next = glow.base * flicker * boost;
        if (Math.abs(mat.emissiveIntensity - next) > 0.012) {
          mat.emissiveIntensity = next;
          anim = true;
        }
      } else if (mat instanceof THREE.MeshBasicMaterial) {
        const next = glow.base * flicker * boost;
        if (Math.abs(mat.opacity - next) > 0.012) {
          mat.opacity = next;
          anim = true;
        }
      }
    }

    for (const lamp of this.lamps) {
      const id = lamp.mesh.userData.placedId as string | undefined;
      lamp.on = id ? !!lightsOn?.[id] : lamp.on;
      const mat = lamp.mesh.material as THREE.MeshStandardMaterial;
      if (!mat?.emissive) continue;
      const effective = lamp.on && night;
      const target = effective ? 0.62 + Math.sin(phase * 3.2) * 0.1 : night ? 0.04 : 0.02;
      mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, target, 0.12);
      anim = true;
    }

    for (const light of this.ceilingLights) {
      const mat = light.mesh.material as THREE.MeshBasicMaterial;
      const target = light.base * (night ? 0.35 : evening ? 0.55 : 0.85);
      const flicker = target * (0.96 + Math.sin(phase * light.speed) * 0.04);
      if (Math.abs(mat.opacity - flicker) > 0.008) {
        mat.opacity = flicker;
        anim = true;
      }
    }

    for (const sway of this.sways) {
      const wind = 0.85 + Math.sin(phase * 0.4) * 0.15;
      const v = Math.sin(phase * sway.speed + sway.phase) * sway.amp * wind;
      if (sway.axis === "z") sway.obj.rotation.z = v;
      else if (sway.axis === "y") sway.obj.rotation.y = v;
      else sway.obj.rotation.x = v;
      anim = true;
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
      hand.obj.rotation.z = THREE.MathUtils.lerp(hand.obj.rotation.z, target, 0.28);
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

    return anim;
  }

  dispose() {
    this.tvs = [];
    this.lamps = [];
    this.windowGlows = [];
    this.ceilingLights = [];
    this.sways = [];
    this.clockHands = [];
    this.washerDrums = [];
  }
}
