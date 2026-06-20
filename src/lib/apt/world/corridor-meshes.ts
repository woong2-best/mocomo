"use client";

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { getAptAtlasMaterial } from "@/lib/apt/bondee/apt-texture-atlas";
import { PASTEL, pastelMat } from "@/lib/apt/bondee/dollhouse-meshes";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { PLAN_W } from "@/lib/apt/floor-plan-types";

export const CORRIDOR_LEN = 9.5;
export const CORRIDOR_W = 2.35;
export const CORRIDOR_H = 2.55;

function box(w: number, h: number, d: number, r = 0.04) {
  return new RoundedBoxGeometry(w, h, d, 2, r);
}

function add(g: THREE.Group, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
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
  state: "open" | "closed" | "locked";
  isHome: boolean;
};

/** 층 복도 — 엘리베이터 홀 ↔ 현관문 */
export function buildCorridorFloor(floorIndex: number, homeDoorIndex = 1, doorCount = 3): THREE.Group {
  const g = new THREE.Group();
  g.name = "apt-corridor";
  g.userData.floor = floorIndex;

  const floorMat = getAptAtlasMaterial(floorIndex % 2 === 0 ? "floorWood" : "floorAlt");
  const wallMat = getAptAtlasMaterial("wall");
  const trimMat = getAptAtlasMaterial("trim");

  add(g, box(CORRIDOR_LEN, 0.1, CORRIDOR_W), floorMat, 0, 0.05, 0);
  const wallN = add(g, box(CORRIDOR_LEN, CORRIDOR_H, 0.1), wallMat, 0, CORRIDOR_H / 2, -CORRIDOR_W / 2);
  wallN.userData.isOccluder = true;
  wallN.userData.baseOpacity = 1;
  wallN.userData.occludeOpacity = 0.28;
  const wallS = add(g, box(CORRIDOR_LEN, CORRIDOR_H, 0.1), wallMat.clone(), 0, CORRIDOR_H / 2, CORRIDOR_W / 2 - 0.05);
  wallS.userData.isOccluder = true;
  wallS.userData.baseOpacity = 1;
  wallS.userData.occludeOpacity = 0.28;

  add(g, box(CORRIDOR_LEN, 0.06, CORRIDOR_W), trimMat, 0, CORRIDOR_H - 0.03, 0);
  const lightGeo = box(0.55, 0.04, 0.14, 0.02);
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff4d8, transparent: true, opacity: 0.75 });
  const lightCount = 7;
  const lights = new THREE.InstancedMesh(lightGeo, lightMat, lightCount);
  lights.name = "corridor-ceiling-lights-instanced";
  const m = new THREE.Matrix4();
  for (let i = 0; i < lightCount; i++) {
    m.makeTranslation((i - 3) * 1.15, CORRIDOR_H - 0.12, 0);
    lights.setMatrixAt(i, m);
  }
  lights.instanceMatrix.needsUpdate = true;
  g.add(lights);

  // 엘리베이터 홀
  const elevHall = new THREE.Group();
  elevHall.name = "elevator-hall";
  elevHall.position.set(-CORRIDOR_LEN / 2 + 0.85, 0, 0);
  add(elevHall, box(1.5, CORRIDOR_H, CORRIDOR_W * 0.95), wallMat, 0, CORRIDOR_H / 2, 0);
  add(elevHall, box(1.35, 2.05, 0.08), pastelMat(PASTEL.elevatorDoor), 0, 1.05, CORRIDOR_W / 2 - 0.12);
  const elevDoorL = add(elevHall, box(0.62, 1.85, 0.05, 0.02), pastelMat(PASTEL.elevatorDoor), -0.32, 1, CORRIDOR_W / 2 - 0.08);
  elevDoorL.name = "elevator-door-left";
  const elevDoorR = add(elevHall, box(0.62, 1.85, 0.05, 0.02), pastelMat(PASTEL.elevatorDoor), 0.32, 1, CORRIDOR_W / 2 - 0.08);
  elevDoorR.name = "elevator-door-right";
  const panel = add(elevHall, box(0.22, 0.32, 0.05, 0.02), pastelMat(0xffffff), 0.55, 1.35, CORRIDOR_W / 2 - 0.06);
  panel.name = "elevator-floor-panel";
  add(elevHall, box(0.08, 0.08, 0.04, 0.02), pastelMat(0x22c55e), 0.62, 1.05, CORRIDOR_W / 2 - 0.06);
  add(elevHall, box(0.08, 0.08, 0.04, 0.02), pastelMat(0xef4444), 0.62, 0.92, CORRIDOR_W / 2 - 0.06);
  g.add(elevHall);

  // 소화기 · CCTV · 화분 · 안내판
  const fireExt = add(g, box(0.12, 0.42, 0.1, 0.02), pastelMat(0xcc2222), -1.2, 0.55, -CORRIDOR_W / 2 + 0.06);
  fireExt.name = "corridor-fire-extinguisher";
  fireExt.userData.interact = "fire-extinguisher";
  const cctv = add(g, box(0.08, 0.08, 0.06), pastelMat(0x333344), 0.5, CORRIDOR_H - 0.35, -CORRIDOR_W / 2 + 0.06);
  cctv.name = "corridor-cctv";
  cctv.userData.interact = "cctv";
  add(g, box(0.14, 0.12, 0.14, 0.03), pastelMat(PASTEL.wallMint), 2.1, 0.12, CORRIDOR_W / 2 - 0.2);
  const sign = add(g, box(0.35, 0.22, 0.03, 0.01), pastelMat(0xffffff), -0.3, 1.45, -CORRIDOR_W / 2 + 0.055);
  sign.name = "corridor-sign";
  sign.userData.interact = "sign";

  const doors: CorridorDoorSlot[] = [];
  for (let i = 0; i < doorCount; i++) {
    const z = -0.55 + i * 0.55;
    const isHome = i === homeDoorIndex;
    const slot = buildApartmentDoor(i, z, isHome);
    g.add(slot.group);
    doors.push(slot);
  }
  g.userData.doors = doors;

  return g;
}

/** 평면도 hall-corridor 치수에 맞춘 복도 (없으면 기본 복도) */
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
  const len = THREE.MathUtils.clamp(CORRIDOR_LEN * (0.85 + lenScale * 0.3), 7.5, 12);
  const width = THREE.MathUtils.clamp(CORRIDOR_W * (0.9 + wScale * 0.15), 2.1, 2.8);

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

function buildApartmentDoor(index: number, z: number, isHome: boolean): CorridorDoorSlot {
  const group = new THREE.Group();
  group.position.set(CORRIDOR_LEN / 2 - 1.1, 0, z);

  add(group, box(0.08, CORRIDOR_H, 0.55, 0.02), pastelMat(0xe8e4e8), 0, CORRIDOR_H / 2, 0);
  add(group, box(0.46, 0.06, 0.08, 0.02), pastelMat(0xd4cfc8), 0, 1.78, 0.04);

  const pivot = new THREE.Group();
  pivot.name = "door-pivot";
  pivot.position.set(-0.2, 0.95, 0.02);

  const door = add(pivot, box(0.42, 1.75, 0.06, 0.02), pastelMat(isHome ? 0xd4e8ff : 0xf0f0f0), 0.2, 0, 0);
  door.name = "door-leaf";
  add(pivot, box(0.42, 0.06, 0.07, 0.02), pastelMat(0xc9a882), 0.2, -0.82, 0.02);

  const peep = new THREE.Mesh(
    new THREE.CircleGeometry(0.028, 10),
    new THREE.MeshBasicMaterial({ color: 0x445566 })
  );
  peep.position.set(0.28, 0.15, 0.04);
  pivot.add(peep);

  const innerGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.28, 0.5),
    new THREE.MeshBasicMaterial({ color: 0xfff4d8, transparent: true, opacity: isHome ? 0.35 : 0 })
  );
  innerGlow.name = "door-inner-glow";
  innerGlow.position.set(0.35, 0, 0.02);
  pivot.add(innerGlow);

  group.add(pivot);

  const mailbox = add(group, box(0.11, 0.09, 0.07, 0.02), pastelMat(0x3a5a8a), -0.28, 0.55, 0.06);
  mailbox.name = "mailbox";

  const bell = add(group, box(0.05, 0.05, 0.03, 0.01), pastelMat(0xffd700), 0.28, 1.05, 0.06);
  bell.name = "door-bell";

  const knocker = add(group, box(0.06, 0.06, 0.04, 0.02), pastelMat(0xb8860b), -0.08, 1.05, 0.06);
  knocker.name = "door-knocker";

  const plate = add(group, box(0.38, 0.12, 0.03, 0.01), pastelMat(isHome ? PASTEL.highlight : 0xffffff), 0, 1.55, 0.05);
  plate.name = "nameplate";

  const led = new THREE.Mesh(
    new THREE.CircleGeometry(0.04, 10),
    new THREE.MeshBasicMaterial({ color: 0x94a3b8 })
  );
  led.name = "door-status-led";
  led.position.set(0.22, 1.35, 0.05);
  group.add(led);

  return {
    id: `door-${index}`,
    z,
    unitIndex: index,
    group,
    pivot,
    led,
    bell,
    knocker,
    state: isHome ? "open" : "closed",
    isHome,
  };
}

export function setCorridorDoorState(
  pivot: THREE.Group,
  led: THREE.Mesh | undefined,
  state: "open" | "closed" | "locked"
) {
  const target =
    state === "open" ? Math.PI / 2.2 : state === "locked" ? 0 : 0;
  pivot.rotation.y = THREE.MathUtils.lerp(pivot.rotation.y, target, 0.12);
  if (led && led.material instanceof THREE.MeshBasicMaterial) {
    led.material.color.setHex(
      state === "open" ? 0x4ade80 : state === "locked" ? 0xef4444 : 0x94a3b8
    );
  }
}
