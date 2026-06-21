"use client";

import * as THREE from "three";
import { APT_LOBBY_FLOOR, APT_PENTHOUSE_FLOOR, APT_TOTAL_FLOORS } from "@/lib/apt/constants";
import { APT_ART, aptMat } from "./apt-world-art";
import { createLodGroup } from "./apt-lod-manager";
import { buildHeroDistrictLights, buildHeroDistrictPlaza } from "./apt-hero-district";
import { buildHeroTowerLandmarks } from "./apt-hero-tower";
import type { WindowLifeKind } from "./apt-social-presence";

export const MEGA_FLOOR_H = 0.092;
export const MEGA_TOWER_W = 2.8;
export const MEGA_TOWER_D = 2.2;

const LABEL_FLOORS = [1, 496, 711, 999, APT_PENTHOUSE_FLOOR];

function floorLabelSprite(floor: number): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 48;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  if (typeof ctx.roundRect === "function") ctx.roundRect(4, 4, 120, 40, 8);
  else ctx.fillRect(4, 4, 120, 40);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px system-ui,sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const text = floor === APT_PENTHOUSE_FLOOR ? "PH" : floor === APT_LOBBY_FLOOR ? "로비" : `${floor}F`;
  ctx.fillText(text, 64, 24);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(1.1, 0.42, 1);
  sp.userData.floor = floor;
  sp.name = `floor-label-${floor}`;
  return sp;
}

export type MegatowerFacade = {
  root: THREE.Group;
  pickFloor: (ray: THREE.Ray, root: THREE.Group) => number | null;
  tick: (phase: number) => boolean;
  dispose: () => void;
};

export type MegatowerActivity = {
  homeFloor: number;
  homeDoorOpen?: boolean;
  onlineFloors?: number[];
  windowLifeByFloor?: Map<number, WindowLifeKind>;
  streamingFloors?: number[];
};

export function buildMegatowerFacade(homeFloor: number, activity?: MegatowerActivity): MegatowerFacade {
  const root = new THREE.Group();
  root.name = "megatower-facade";
  const totalH = APT_TOTAL_FLOORS * MEGA_FLOOR_H;
  const count = APT_TOTAL_FLOORS;

  const slabGeo = new THREE.BoxGeometry(MEGA_TOWER_W, MEGA_FLOOR_H * 0.88, MEGA_TOWER_D);
  const slabMat = aptMat(APT_ART.wallCool, { roughness: 0.82 });
  const floorSlabs = new THREE.InstancedMesh(slabGeo, slabMat, count);
  const winGeo = new THREE.BoxGeometry(MEGA_TOWER_W * 0.08, MEGA_FLOOR_H * 0.45, 0.04);
  const winMat = new THREE.MeshStandardMaterial({
    color: APT_ART.lightWarm,
    emissive: new THREE.Color(APT_ART.lightWarm),
    emissiveIntensity: 0.2,
    transparent: true,
    opacity: 0.6,
  });
  const windows = new THREE.InstancedMesh(winGeo, winMat, count * 2);

  const m = new THREE.Matrix4();
  for (let f = 1; f <= count; f++) {
    const y = (f - 0.5) * MEGA_FLOOR_H;
    m.makeTranslation(0, y, 0);
    floorSlabs.setMatrixAt(f - 1, m);
    m.makeTranslation(-MEGA_TOWER_W * 0.28, y, MEGA_TOWER_D / 2 + 0.05);
    windows.setMatrixAt((f - 1) * 2, m);
    m.makeTranslation(MEGA_TOWER_W * 0.28, y, MEGA_TOWER_D / 2 + 0.05);
    windows.setMatrixAt((f - 1) * 2 + 1, m);
  }
  floorSlabs.instanceMatrix.needsUpdate = true;
  windows.instanceMatrix.needsUpdate = true;
  root.add(floorSlabs);
  root.add(windows);

  const homeY = (homeFloor - 0.5) * MEGA_FLOOR_H;
  const homeBand = new THREE.Mesh(
    new THREE.BoxGeometry(MEGA_TOWER_W + 0.12, MEGA_FLOOR_H * 1.6, MEGA_TOWER_D + 0.12),
    new THREE.MeshBasicMaterial({ color: APT_ART.accent, transparent: true, opacity: 0.22 })
  );
  homeBand.position.y = homeY;
  homeBand.name = "home-floor-band";
  root.add(homeBand);

  if (activity?.homeDoorOpen !== false) {
    const doorGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.18, MEGA_FLOOR_H * 0.7),
      new THREE.MeshBasicMaterial({ color: APT_ART.lightWarm, transparent: true, opacity: 0.75 })
    );
    doorGlow.position.set(MEGA_TOWER_W / 2 + 0.08, homeY, 0);
    doorGlow.name = "home-door-open-glow";
    root.add(doorGlow);
  }

  const onlineFloors = activity?.onlineFloors ?? [homeFloor];
  for (const fl of onlineFloors) {
    if (fl < 1 || fl > APT_TOTAL_FLOORS) continue;
    const dot = new THREE.Mesh(
      new THREE.CircleGeometry(0.04, 10),
      new THREE.MeshBasicMaterial({ color: 0x4ade80 })
    );
    dot.position.set(-MEGA_TOWER_W / 2 - 0.12, (fl - 0.5) * MEGA_FLOOR_H, MEGA_TOWER_D / 2 + 0.1);
    dot.name = `online-dot-${fl}`;
    root.add(dot);
  }

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(MEGA_TOWER_W + 0.4, 0.15, MEGA_TOWER_D + 0.4),
    aptMat(APT_ART.accent)
  );
  roof.position.y = totalH + 0.08;
  root.add(roof);

  for (const fl of new Set([...LABEL_FLOORS, homeFloor])) {
    if (fl < 1 || fl > APT_TOTAL_FLOORS) continue;
    const sp = floorLabelSprite(fl);
    sp.position.set(MEGA_TOWER_W / 2 + 0.65, (fl - 0.5) * MEGA_FLOOR_H, 0);
    root.add(sp);
  }

  root.add(
    buildHeroTowerLandmarks(
      totalH,
      count,
      activity?.windowLifeByFloor,
      activity?.streamingFloors ?? []
    )
  );

  root.userData.totalHeight = totalH;
  root.userData.pickBox = new THREE.Box3(
    new THREE.Vector3(-MEGA_TOWER_W / 2, 0, -MEGA_TOWER_D / 2),
    new THREE.Vector3(MEGA_TOWER_W / 2, totalH, MEGA_TOWER_D / 2)
  );

  return {
    root,
    pickFloor(ray, towerRoot) {
      const hit = new THREE.Vector3();
      const localBox = (towerRoot.userData.pickBox as THREE.Box3).clone();
      const inv = towerRoot.matrixWorld.clone().invert();
      const localRay = ray.clone().applyMatrix4(inv);
      if (!localRay.intersectBox(localBox, hit)) return null;
      const floor = Math.round(hit.y / MEGA_FLOOR_H + 0.5);
      return Math.min(APT_TOTAL_FLOORS, Math.max(APT_LOBBY_FLOOR, floor));
    },
    tick(phase) {
      const pulse = 0.22 + Math.sin(phase * 1.3) * 0.08 + Math.sin(phase * 4.7) * 0.05 + Math.sin(phase * 0.7) * 0.03;
      if (Math.abs(winMat.emissiveIntensity - pulse) > 0.015) {
        winMat.emissiveIntensity = pulse;
        return true;
      }
      return false;
    },
    dispose() {
      slabGeo.dispose();
      slabMat.dispose();
      winGeo.dispose();
      winMat.dispose();
    },
  };
}

function sideTowerLod(facade: MegatowerFacade, scale: number): THREE.LOD {
  const totalH = facade.root.userData.totalHeight as number;
  const low = new THREE.Mesh(
    new THREE.BoxGeometry(MEGA_TOWER_W * scale, totalH, MEGA_TOWER_D * scale),
    aptMat(APT_ART.wallCool, { transparent: true, opacity: 0.88 })
  );
  low.position.y = totalH / 2;
  low.name = "side-tower-lod-low";
  return createLodGroup([
    { mesh: facade.root, distance: 0 },
    { mesh: low, distance: 42 },
  ]);
}

export function buildDistrictComplex(
  homeFloor: number,
  activity?: MegatowerActivity
): {
  root: THREE.Group;
  main: MegatowerFacade;
  sideLods: THREE.LOD[];
  heroLights: THREE.Group;
  dispose: () => void;
} {
  const root = new THREE.Group();
  root.name = "apt-district-complex";
  const main = buildMegatowerFacade(homeFloor, activity);
  root.add(main.root);

  root.add(buildHeroDistrictPlaza());
  const heroLights = buildHeroDistrictLights();
  root.add(heroLights);

  const sideLods: THREE.LOD[] = [];
  const b = buildMegatowerFacade(Math.min(APT_TOTAL_FLOORS, homeFloor + 120), activity);
  b.root.scale.setScalar(0.72);
  const bLod = sideTowerLod(b, 0.72);
  bLod.position.set(-5.5, 0, 2);
  root.add(bLod);
  sideLods.push(bLod);

  const c = buildMegatowerFacade(Math.min(APT_TOTAL_FLOORS, homeFloor + 280), activity);
  c.root.scale.setScalar(0.65);
  const cLod = sideTowerLod(c, 0.65);
  cLod.position.set(5.8, 0, -1.5);
  root.add(cLod);
  sideLods.push(cLod);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(48, 36), aptMat(APT_ART.floorWoodAlt));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.01;
  root.add(ground);

  return {
    root,
    main,
    sideLods,
    heroLights,
    dispose() {
      main.dispose();
      for (const lod of sideLods) {
        lod.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.geometry.dispose();
            if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
            else o.material.dispose();
          }
        });
      }
      ground.geometry.dispose();
      (ground.material as THREE.Material).dispose();
    },
  };
}

export function megaFloorToWorldY(floor: number) {
  return (floor - 0.5) * MEGA_FLOOR_H;
}
