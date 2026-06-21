"use client";

import * as THREE from "three";
import { getAptAtlasMaterial } from "@/lib/apt/bondee/apt-texture-atlas";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { PLAN_W } from "@/lib/apt/floor-plan-types";
import {
  APT_ART,
  aptBox,
  aptFloorMat,
  aptGlowMat,
  aptMat,
  aptMetalMat,
  aptTrimMat,
  aptWallMat,
  aptWoodMat,
  doorColorForUnit,
  makeBulletinBoardTexture,
  makeCanvasLabel,
} from "./apt-world-art";
import {
  buildDetailedApartmentDoor,
  buildDetailedCctv,
  buildDetailedElevatorHall,
  buildDetailedFireExtinguisher,
  buildDetailedPlanter,
  syncDoorVisuals,
} from "./apt-world-props";
import { applyNeighborDoorPersonality } from "./corridor-neighbor-archetypes";

export const CORRIDOR_LEN = 10.5;
export const CORRIDOR_W = 2.55;
export const CORRIDOR_H = 2.65;

function add(g: THREE.Group, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, ry = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

export type CorridorDoorSlot = {
  id: string;
  z: number;
  unitIndex: number;
  group: THREE.Group;
  pivot: THREE.Group;
  led?: THREE.Mesh;
  bell?: THREE.Mesh;
  knocker?: THREE.Mesh;
  innerGlow?: THREE.Mesh;
  state: "open" | "closed" | "locked";
  isHome: boolean;
};

function buildCorridorArchitecture(g: THREE.Group, len: number, width: number, height: number, floorIndex: number) {
  const floorMat = getAptAtlasMaterial(floorIndex % 2 === 0 ? "floorWood" : "floorAlt");
  const wallMat = getAptAtlasMaterial("wall");
  const trimMat = getAptAtlasMaterial("trim");

  add(g, aptBox(len, 0.11, width), floorMat, 0, 0.055, 0);
  add(g, aptBox(len, 0.035, width, 0.012), trimMat, 0, 0.018, 0);

  for (const zSign of [-1, 1] as const) {
    const wall = add(g, aptBox(len, height, 0.11), wallMat, 0, height / 2, zSign * (width / 2 - 0.04));
    wall.userData.isOccluder = true;
    wall.userData.baseOpacity = 1;
    wall.userData.occludeOpacity = 0.62;
    add(g, aptBox(len, 0.07, 0.06, 0.012), trimMat, 0, 0.12, zSign * (width / 2 - 0.02));
    add(g, aptBox(len, 0.06, 0.05, 0.01), trimMat, 0, height - 0.08, zSign * (width / 2 - 0.03));
  }

  add(g, aptBox(len, 0.07, width, 0.015), aptMat(APT_ART.wallPeach, { roughness: 0.88 }), 0, height - 0.035, 0);

  add(
    g,
    aptBox(1.65, 0.018, width * 0.88, 0.006),
    aptMat(APT_ART.elevatorZone, { roughness: 0.55 }),
    -len / 2 + 0.9,
    0.024,
    0
  );
  const elevLabel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.52, 0.14),
    new THREE.MeshBasicMaterial({
      map: makeCanvasLabel("ELEVATOR", { bg: APT_ART.signWarm, fg: "#ffffff", w: 160, h: 48 }),
      transparent: true,
    })
  );
  elevLabel.position.set(-len / 2 + 0.9, height * 0.68, width / 2 - 0.06);
  elevLabel.name = "corridor-elev-label";
  g.add(elevLabel);

  for (let i = 0; i < 5; i++) {
    const scuff = add(
      g,
      aptBox(0.18 + (i % 2) * 0.08, 0.008, 0.12, 0.003),
      aptMat(APT_ART.floorWoodAlt, { transparent: true, opacity: 0.35 }),
      -len / 2 + 1.2 + i * 1.6,
      0.025,
      (i % 2 === 0 ? -1 : 1) * 0.15
    );
    scuff.name = "floor-scuff";
  }
}

function buildCorridorProps(g: THREE.Group, len: number, width: number, height: number, floorIndex: number) {
  const fireExt = buildDetailedFireExtinguisher();
  fireExt.position.set(-1.4, 0, -width / 2 + 0.1);
  g.add(fireExt);

  const cctv = buildDetailedCctv();
  cctv.position.set(0.2, height - 0.38, -width / 2 + 0.1);
  g.add(cctv);

  const planter = buildDetailedPlanter();
  planter.position.set(1.8, 0, width / 2 - 0.24);
  g.add(planter);

  const planter2 = buildDetailedPlanter();
  planter2.position.set(-0.5, 0, width / 2 - 0.22);
  planter2.scale.setScalar(0.85);
  g.add(planter2);

  const bulletin = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.32),
    new THREE.MeshStandardMaterial({ map: makeBulletinBoardTexture(floorIndex), roughness: 0.85 })
  );
  bulletin.position.set(-0.8, 1.35, -width / 2 + 0.055);
  bulletin.name = "corridor-bulletin";
  bulletin.userData.interact = "sign";
  g.add(bulletin);

  const floorMap = new THREE.Mesh(
    new THREE.PlaneGeometry(0.28, 0.38),
    new THREE.MeshStandardMaterial({
      map: makeCanvasLabel(`${floorIndex}F`, { bg: APT_ART.signBlue, fg: "#ffffff", w: 96, h: 128 }),
      roughness: 0.7,
    })
  );
  floorMap.position.set(len / 2 - 0.35, 1.25, width / 2 - 0.055);
  floorMap.rotation.y = Math.PI;
  floorMap.name = "corridor-floor-map";
  g.add(floorMap);

  const mailCluster = new THREE.Group();
  mailCluster.name = "corridor-mailboxes";
  mailCluster.position.set(len / 2 - 0.55, 0.55, -width / 2 + 0.08);
  for (let i = 0; i < 3; i++) {
    add(mailCluster, aptBox(0.1, 0.08, 0.06, 0.015), aptMat(0x3a5a8a), i * 0.12 - 0.12, 0, 0);
  }
  g.add(mailCluster);

  add(g, aptBox(0.55, 0.02, 0.35, 0.008), aptMat(APT_ART.trimWood, { transparent: true, opacity: 0.55 }), 0.6, 0.025, width / 2 - 0.18);

  const elevSign = new THREE.Mesh(
    new THREE.PlaneGeometry(0.38, 0.14),
    new THREE.MeshBasicMaterial({
      map: makeCanvasLabel("ELEV", { bg: APT_ART.signWarm, fg: "#ffffff", w: 128, h: 48 }),
      transparent: true,
    })
  );
  elevSign.position.set(-len / 2 + 0.95, height - 0.22, 0);
  elevSign.name = "corridor-elev-sign";
  g.add(elevSign);

  const clock = new THREE.Group();
  clock.name = "corridor-clock";
  clock.position.set(len / 2 - 0.9, 1.85, -width / 2 + 0.06);
  add(clock, aptBox(0.14, 0.14, 0.02, 0.02), aptMat(0xffffff), 0, 0, 0);
  const hourHand = add(clock, aptBox(0.02, 0.05, 0.005, 0.002), aptMat(0x334455), 0, 0.01, 0.012);
  hourHand.name = "clock-hour-hand";
  const minuteHand = add(clock, aptBox(0.04, 0.012, 0.005, 0.002), aptMat(0x334455), 0.015, -0.01, 0.012, -0.8);
  minuteHand.name = "clock-minute-hand";
  const secondHand = add(clock, aptBox(0.045, 0.006, 0.004, 0.001), aptMat(0xcc4444), 0.018, -0.012, 0.013, -1.1);
  secondHand.name = "clock-second-hand";
  g.add(clock);
}

function buildApartmentDoor(index: number, z: number, isHome: boolean): CorridorDoorSlot {
  const parts = buildDetailedApartmentDoor(index, z, CORRIDOR_H, isHome, doorColorForUnit(index));
  syncDoorVisuals(parts, isHome ? "open" : "closed");

  const unitLabel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.22, 0.1),
    new THREE.MeshBasicMaterial({
      map: makeCanvasLabel(isHome ? "MY HOME" : `${100 + index * 2}호`, {
        bg: isHome ? APT_ART.accentSoft : 0xffffff,
      }),
      transparent: true,
    })
  );
  unitLabel.position.set(0, 1.62, 0.07);
  parts.group.add(unitLabel);

  const doormat = add(parts.group, aptBox(0.32, 0.015, 0.22, 0.006), aptMat(0x4a4038, { roughness: 0.95 }), 0.05, 0.015, 0.04);
  doormat.name = "door-mat";

  applyNeighborDoorPersonality(parts.group, parts, index, isHome);

  if (isHome) {
    add(parts.group, aptBox(0.1, 0.05, 0.16, 0.015), aptMat(0x444455), 0.18, 0.04, 0.12, 0.3);
  }

  return {
    id: `door-${index}`,
    z,
    unitIndex: index,
    group: parts.group,
    pivot: parts.pivot,
    led: parts.led,
    bell: parts.bell,
    knocker: parts.knocker,
    innerGlow: parts.innerGlow,
    state: isHome ? "open" : "closed",
    isHome,
  };
}

/** 통합 아트 디렉션 복도 — 실제 아파트 층 복도 */
export function buildCorridorFloor(floorIndex: number, homeDoorIndex = 1, doorCount = 3): THREE.Group {
  const g = new THREE.Group();
  g.name = "apt-corridor";
  g.userData.floor = floorIndex;

  buildCorridorArchitecture(g, CORRIDOR_LEN, CORRIDOR_W, CORRIDOR_H, floorIndex);
  buildCorridorProps(g, CORRIDOR_LEN, CORRIDOR_W, CORRIDOR_H, floorIndex);

  const elevHall = buildDetailedElevatorHall({ floor: floorIndex, corridorSide: "north" });
  elevHall.position.set(-CORRIDOR_LEN / 2 + 0.95, 0, 0);
  g.add(elevHall);

  const doors: CorridorDoorSlot[] = [];
  for (let i = 0; i < doorCount; i++) {
    const z = -0.6 + i * 0.58;
    const slot = buildApartmentDoor(i, z, i === homeDoorIndex);
    slot.group.position.set(CORRIDOR_LEN / 2 - 1.15, 0, 0);
    g.add(slot.group);
    doors.push(slot);
  }
  g.userData.doors = doors;
  g.userData.corridorLen = CORRIDOR_LEN;
  g.userData.corridorW = CORRIDOR_W;
  g.userData.corridorH = CORRIDOR_H;

  return g;
}

export function buildCorridorFromPlan(
  floorIndex: number,
  rooms: AptRoom[],
  homeDoorIndex = 1,
  doorCount = 3
): THREE.Group {
  const corridor = rooms.find((r) => r.id === "hall-corridor");
  if (!corridor) return buildCorridorFloor(floorIndex, homeDoorIndex, doorCount);

  const lenScale = corridor.w / PLAN_W;
  const wScale = corridor.h / 95;
  const len = THREE.MathUtils.clamp(CORRIDOR_LEN * (0.85 + lenScale * 0.3), 7.8, 12.5);
  const width = THREE.MathUtils.clamp(CORRIDOR_W * (0.9 + wScale * 0.15), 2.2, 2.9);

  const g = buildCorridorFloor(floorIndex, homeDoorIndex, doorCount);
  g.scale.set(len / CORRIDOR_LEN, 1, width / CORRIDOR_W);
  g.userData.scaledLen = len;
  g.userData.scaledW = width;
  g.userData.fromPlan = true;
  return g;
}

export function findCorridorInteractables(root: THREE.Object3D): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (o.userData.interact) out.push(o);
  });
  return out;
}

export function setCorridorDoorState(
  pivot: THREE.Group,
  led: THREE.Mesh | undefined,
  state: "open" | "closed" | "locked",
  innerGlow?: THREE.Mesh
) {
  const target = state === "open" ? Math.PI / 2.15 : 0;
  pivot.rotation.y = THREE.MathUtils.lerp(pivot.rotation.y, target, 0.1);
  if (led && led.material instanceof THREE.MeshBasicMaterial) {
    led.material.color.setHex(
      state === "open" ? 0x4ade80 : state === "locked" ? 0xef4444 : 0x94a3b8
    );
  }
  if (innerGlow && innerGlow.material instanceof THREE.MeshBasicMaterial) {
    innerGlow.material.opacity = state === "open" ? 0.52 : 0;
  }
}
