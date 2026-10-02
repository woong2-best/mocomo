"use client";

import * as THREE from "three";
import {
  getDayNightLighting,
  getRealWorldHour,
  getDayPhase,
  isLampEffective,
  type DayNightLighting,
} from "@/lib/apt/day-night";
import type { BondeePlacedItem } from "@/lib/apt/bondee/types";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { itemWorldPos } from "@/lib/apt/bondee/home-floor-meshes";

export type LampSpec = {
  id: string;
  x: number;
  y: number;
  z: number;
  on: boolean;
};

export type SceneLightingRefs = {
  hemi: THREE.HemisphereLight;
  ambient: THREE.AmbientLight;
  sun: THREE.DirectionalLight;
  fill: THREE.DirectionalLight;
  windowSun: THREE.DirectionalLight;
};

export function createSceneLighting(scene: THREE.Scene): SceneLightingRefs {
  const hemi = new THREE.HemisphereLight(0xfff8f0, 0xe8d8f0, 0.55);
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(0xffffff, 0.42);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff5eb, 0.72);
  sun.position.set(6, 12, 8);
  sun.castShadow = false;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0xd8eeff, 0.28);
  fill.position.set(-5, 6, -4);
  scene.add(fill);

  const windowSun = new THREE.DirectionalLight(0xfff0d8, 0.38);
  windowSun.position.set(-6, 8, -5);
  scene.add(windowSun);

  return { hemi, ambient, sun, fill, windowSun };
}

export function applyDayNightToScene(
  scene: THREE.Scene,
  refs: SceneLightingRefs,
  lighting: DayNightLighting,
  renderer?: THREE.WebGLRenderer
) {
  scene.background = new THREE.Color(lighting.skyColor);
  if (scene.fog instanceof THREE.Fog) {
    scene.fog.color.setHex(lighting.skyColor);
    scene.fog.near = lighting.fogNear;
    scene.fog.far = lighting.fogFar;
  }

  refs.hemi.color.setHex(lighting.hemiSky);
  refs.hemi.groundColor.setHex(lighting.hemiGround);
  refs.hemi.intensity = lighting.hemiIntensity;

  refs.ambient.color.setHex(lighting.ambientColor);
  refs.ambient.intensity = lighting.ambientIntensity;

  refs.sun.color.setHex(lighting.sunColor);
  refs.sun.intensity = lighting.sunIntensity;

  refs.fill.color.setHex(lighting.fillColor);
  refs.fill.intensity = lighting.fillIntensity;

  refs.windowSun.color.setHex(lighting.sunColor);
  refs.windowSun.intensity =
    lighting.sunIntensity * 0.6 * (0.4 + lighting.windowGlow * 0.85) * (1 - lighting.darkness * 0.25);

  if (renderer) {
    renderer.toneMappingExposure = lighting.exposure;
  }
}

/** 가구 조명 포인트라이트 관리 */
export class LampLightManager {
  private root = new THREE.Group();
  private lamps = new Map<string, THREE.PointLight>();
  private glowMeshes = new Map<string, THREE.Mesh>();
  private darkness = 0;

  constructor(parent: THREE.Object3D) {
    parent.add(this.root);
  }

  setDarkness(darkness: number) {
    this.darkness = darkness;
  }

  sync(lamps: LampSpec[], effective: boolean) {
    const ids = new Set(lamps.map((l) => l.id));

    for (const id of [...this.lamps.keys()]) {
      if (!ids.has(id)) this.removeLamp(id);
    }

    for (const lamp of lamps) {
      let light = this.lamps.get(lamp.id);
      if (!light) {
        light = new THREE.PointLight(0xffe8c8, 0, 4.5, 1.8);
        light.name = `lamp-${lamp.id}`;
        this.root.add(light);
        this.lamps.set(lamp.id, light);
      }
      light.position.set(lamp.x, lamp.y + 0.88, lamp.z);
      const on = lamp.on && effective;
      light.intensity = on ? 1.35 * this.darkness : 0;
      light.visible = on;
    }
  }

  attachGlowMesh(itemId: string, mesh: THREE.Mesh) {
    this.glowMeshes.set(itemId, mesh);
  }

  detachGlowMesh(itemId: string) {
    this.glowMeshes.delete(itemId);
  }

  updateGlows(lightsOn: Record<string, boolean>, effective: boolean) {
    for (const [id, mesh] of this.glowMeshes) {
      const on = !!lightsOn[id] && effective;
      const mat = mesh.material;
      if (mat instanceof THREE.MeshStandardMaterial) {
        mat.emissive.setHex(on ? 0xffe8c0 : 0x000000);
        mat.emissiveIntensity = on ? 0.85 : 0;
      }
    }
  }

  private removeLamp(id: string) {
    const light = this.lamps.get(id);
    if (light) {
      this.root.remove(light);
      this.lamps.delete(id);
    }
    this.glowMeshes.delete(id);
  }

  dispose() {
    for (const light of this.lamps.values()) this.root.remove(light);
    this.lamps.clear();
    this.glowMeshes.clear();
    this.root.parent?.remove(this.root);
  }
}

/** APT 조명 — 실시간 낮/밤 (창문 햇빛·복도 조명·스탠드 연동) */
export class DayNightTicker {
  private hour = getRealWorldHour();
  private lighting = getDayNightLighting(this.hour);
  private lastPhase = getDayPhase(this.hour);

  tick(now = new Date()): { hour: number; lighting: DayNightLighting; changed: boolean } {
    const hour = getRealWorldHour(now);
    const lighting = getDayNightLighting(hour);
    const phase = getDayPhase(hour);
    const changed = phase !== this.lastPhase || Math.abs(hour - this.hour) > 0.05;
    this.hour = hour;
    this.lighting = lighting;
    if (changed) this.lastPhase = phase;
    return { hour, lighting, changed };
  }

  getHour() {
    return this.hour;
  }

  getLighting() {
    return this.lighting;
  }

  lampsEffective() {
    return isLampEffective(this.lighting.darkness);
  }
}

export function collectFloorLampSpecs(
  items: BondeePlacedItem[],
  rooms: AptRoom[],
  lightsOn: Record<string, boolean> = {},
  scale = 1,
  offset = { x: 0, y: 0, z: 0 }
): LampSpec[] {
  const specs: LampSpec[] = [];
  for (const item of items) {
    if (item.kind !== "floor_lamp") continue;
    const room = rooms.find((r) => r.id === item.roomId);
    if (!room) continue;
    const p = itemWorldPos(item, room);
    specs.push({
      id: item.id,
      x: p.x * scale + offset.x,
      y: offset.y,
      z: p.z * scale + offset.z,
      on: !!lightsOn[item.id],
    });
  }
  return specs;
}
