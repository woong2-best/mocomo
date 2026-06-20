"use client";

import * as THREE from "three";

type AcStrip = {
  pivot: THREE.Group;
  phase: number;
  speed: number;
  ampZ: number;
  ampX: number;
};

type AcUnit = {
  led: THREE.Mesh;
  wind: THREE.Mesh | null;
  strips: AcStrip[];
};

const STRIP_SPECS = [
  { phase: 0.0, speed: 2.1, ampZ: 0.055, ampX: 0.022 },
  { phase: 1.37, speed: 2.45, ampZ: 0.07, ampX: 0.028 },
  { phase: 2.74, speed: 2.25, ampZ: 0.06, ampX: 0.025 },
  { phase: 0.85, speed: 2.55, ampZ: 0.065, ampX: 0.03 },
  { phase: 2.1, speed: 2.35, ampZ: 0.058, ampX: 0.024 },
  { phase: 3.2, speed: 2.15, ampZ: 0.072, ampX: 0.027 },
] as const;

/** 에어컨 송풍·종이 스트립·전원 LED 연출 (CSS transform 수준의 경량 sin 애니메이션) */
export class AcEffectManager {
  private units = new Map<string, AcUnit>();

  register(itemId: string, mesh: THREE.Object3D) {
    const led = mesh.getObjectByName("ac-led");
    const stripsRoot = mesh.getObjectByName("ac-strips");
    if (!(led instanceof THREE.Mesh) || !(stripsRoot instanceof THREE.Group)) return;

    const strips: AcStrip[] = [];
    stripsRoot.children.forEach((child, i) => {
      if (!(child instanceof THREE.Group)) return;
      const spec = STRIP_SPECS[i % STRIP_SPECS.length];
      strips.push({ pivot: child, ...spec });
    });

    const wind = mesh.getObjectByName("ac-wind");
    this.units.set(itemId, {
      led,
      wind: wind instanceof THREE.Mesh ? wind : null,
      strips,
    });
  }

  unregister(itemId: string) {
    this.units.delete(itemId);
  }

  hasUnits() {
    return this.units.size > 0;
  }

  hasAnyOn(acOn: Record<string, boolean> | undefined) {
    for (const id of this.units.keys()) {
      if (acOn?.[id] !== false) return true;
    }
    return false;
  }

  syncAll(acOn: Record<string, boolean> | undefined) {
    for (const [id, unit] of this.units) {
      this.applyLed(unit, acOn?.[id] !== false);
      if (acOn?.[id] === false) this.resetStrips(unit);
    }
  }

  /** @returns true when continuous animation frames are needed */
  tick(phase: number, acOn: Record<string, boolean> | undefined): boolean {
    let animating = false;
    for (const [id, unit] of this.units) {
      const on = acOn?.[id] !== false;
      this.applyLed(unit, on);
      if (!on) {
        this.resetStrips(unit);
        if (unit.wind) unit.wind.visible = false;
        continue;
      }
      animating = true;
      for (const strip of unit.strips) {
        strip.pivot.rotation.z = Math.sin(phase * strip.speed + strip.phase) * strip.ampZ;
        strip.pivot.rotation.x =
          Math.sin(phase * strip.speed * 0.68 + strip.phase * 1.25) * strip.ampX;
      }
      if (unit.wind) {
        unit.wind.visible = true;
        const mat = unit.wind.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.055 + Math.sin(phase * 3.4 + id.length * 0.3) * 0.022;
      }
    }
    return animating;
  }

  dispose() {
    this.units.clear();
  }

  private applyLed(unit: AcUnit, on: boolean) {
    const mat = unit.led.material;
    if (!(mat instanceof THREE.MeshStandardMaterial)) return;
    mat.emissive.setHex(on ? 0x44ccff : 0x000000);
    mat.emissiveIntensity = on ? 0.92 : 0;
    mat.color.setHex(on ? 0x88eeff : 0xcccccc);
  }

  private resetStrips(unit: AcUnit) {
    for (const strip of unit.strips) {
      strip.pivot.rotation.z = 0;
      strip.pivot.rotation.x = 0;
    }
  }
}

export function isAcRunning(acOn: Record<string, boolean> | undefined, itemId: string) {
  return acOn?.[itemId] !== false;
}
