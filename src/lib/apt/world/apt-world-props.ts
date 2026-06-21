"use client";

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import {
  APT_ART,
  aptBox,
  aptGlowMat,
  aptMat,
  aptMetalMat,
  aptTrimMat,
  aptWallMat,
  aptWoodMat,
} from "./apt-world-art";

function box(w: number, h: number, d: number, r = 0.04) {
  return aptBox(w, h, d, r);
}

function addMesh(
  g: THREE.Group,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0
) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  g.add(m);
  return m;
}

const METAL = () => aptMat(APT_ART.trimWood, { metalness: 0.28, roughness: 0.38 });
const METAL_DARK = () => aptWoodMat(true);
const ELEV_DOOR = () => aptMat(APT_ART.elevatorDoor, { metalness: 0.1, roughness: 0.35 });

/** 실제 엘리베이터 홀 — 프레임·호출 버튼·층수 표시·양개문 */
export function buildDetailedElevatorHall(opts?: {
  floor?: number;
  corridorSide?: "north" | "south";
}): THREE.Group {
  const floor = opts?.floor ?? 1;
  const corridorSide = opts?.corridorSide ?? "north";
  const g = new THREE.Group();
  g.name = "elevator-hall";

  const frameMat = aptWallMat({ roughness: 0.78 });
  const panelMat = aptMat(APT_ART.trimDark, { roughness: 0.55, metalness: 0.08 });
  const doorMat = ELEV_DOOR();

  addMesh(g, box(1.55, 2.65, 0.12), frameMat, 0, 1.32, corridorSide === "north" ? -0.06 : 0.06);
  addMesh(g, box(1.45, 0.08, 0.14, 0.02), aptTrimMat(), 0, 2.58, corridorSide === "north" ? 0.02 : -0.02);
  addMesh(g, box(0.08, 2.5, 0.08), frameMat, -0.74, 1.3, 0);
  addMesh(g, box(0.08, 2.5, 0.08), frameMat, 0.74, 1.3, 0);

  const doorZ = corridorSide === "north" ? 0.62 : -0.62;
  const doorL = addMesh(g, box(0.64, 1.92, 0.06, 0.02), doorMat, -0.33, 1.02, doorZ);
  doorL.name = "elevator-door-left";
  const doorR = addMesh(g, box(0.64, 1.92, 0.06, 0.02), doorMat, 0.33, 1.02, doorZ);
  doorR.name = "elevator-door-right";

  for (const x of [-0.33, 0.33] as const) {
    addMesh(g, box(0.04, 1.5, 0.02, 0.008), aptMetalMat(true), x, 1.05, doorZ + (corridorSide === "north" ? 0.04 : -0.04));
  }

  const panel = new THREE.Group();
  panel.name = "elevator-floor-panel";
  panel.position.set(0.58, 1.48, doorZ + (corridorSide === "north" ? 0.05 : -0.05));
  addMesh(panel, box(0.26, 0.34, 0.05, 0.02), panelMat, 0, 0, 0);
  const num = makeFloorDisplayMesh(floor);
  num.name = "elevator-floor-number";
  num.position.set(0, 0.04, 0.03);
  panel.add(num);
  addMesh(panel, box(0.1, 0.1, 0.04, 0.02), aptMat(0x22c55e), -0.06, -0.08, 0.03);
  addMesh(panel, box(0.1, 0.1, 0.04, 0.02), aptMat(0xef4444), 0.06, -0.08, 0.03);
  addMesh(panel, box(0.08, 0.08, 0.03, 0.01), aptGlowMat(0xffd700, 0.15), 0, -0.08, 0.035);
  g.add(panel);

  const callPanel = new THREE.Group();
  callPanel.name = "elevator-call-panel";
  callPanel.position.set(-0.58, 1.15, doorZ + (corridorSide === "north" ? 0.04 : -0.04));
  addMesh(callPanel, box(0.14, 0.22, 0.04, 0.015), panelMat, 0, 0, 0);
  addMesh(callPanel, box(0.08, 0.08, 0.025, 0.01), aptMat(0x22c55e), 0, 0.05, 0.025);
  addMesh(callPanel, box(0.08, 0.08, 0.025, 0.01), aptMat(0xef4444), 0, -0.05, 0.025);
  g.add(callPanel);

  const carHint = addMesh(g, box(1.2, 0.04, 1.2, 0.02), aptMat(APT_ART.elevatorZone, { roughness: 0.5 }), 0, 0.04, 0);
  carHint.name = "elevator-car-floor";
  carHint.receiveShadow = true;

  return g;
}

/** 엘리베이터 카 내부 */
export function buildDetailedElevatorCarInterior(floor = 1): THREE.Group {
  const g = new THREE.Group();
  g.name = "elevator-hall-interior";

  const wall = aptWallMat({ roughness: 0.75 });
  const rail = METAL_DARK();

  const car = new THREE.Group();
  car.name = "elevator-car-interior";
  addMesh(car, box(1.38, 2.18, 1.38, 0.03), wall, 0, 1.12, 0);

  const mirror = new THREE.Mesh(
    box(1.12, 1.55, 0.04),
    new THREE.MeshStandardMaterial({ color: 0xd8e8f8, metalness: 0.88, roughness: 0.06 })
  );
  mirror.position.set(0, 1.28, -0.64);
  mirror.name = "elevator-mirror";
  car.add(mirror);

  addMesh(car, box(1.25, 0.06, 0.06, 0.015), rail, 0, 0.55, -0.62);
  addMesh(car, box(1.25, 0.06, 0.06, 0.015), rail, 0, 0.55, 0.62);

  const doorL = addMesh(car, box(0.64, 1.88, 0.06, 0.02), ELEV_DOOR(), -0.33, 1.02, 0.64);
  doorL.name = "elevator-door-left";
  const doorR = addMesh(car, box(0.64, 1.88, 0.06, 0.02), ELEV_DOOR(), 0.33, 1.02, 0.64);
  doorR.name = "elevator-door-right";

  const panel = new THREE.Group();
  panel.name = "elevator-floor-panel";
  panel.position.set(0.5, 1.58, 0.64);
  addMesh(panel, box(0.3, 0.24, 0.05, 0.02), aptMat(0x1a1a22), 0, 0, 0);
  const num = makeFloorDisplayMesh(floor);
  num.name = "elevator-floor-number";
  num.position.set(0, 0, 0.03);
  panel.add(num);
  car.add(panel);

  addMesh(car, box(1.15, 0.04, 1.15, 0.02), aptMat(APT_ART.floorTile), 0, 0.04, 0);
  g.add(car);
  return g;
}

export type DetailedDoorParts = {
  group: THREE.Group;
  pivot: THREE.Group;
  led: THREE.Mesh;
  bell?: THREE.Mesh;
  knocker?: THREE.Mesh;
  innerGlow: THREE.Mesh;
  peephole: THREE.Mesh;
};

/** 실제 아파트 현관문 — 프레임·손잡이·초인종·노크·열림 시 내부 조명 */
export function buildDetailedApartmentDoor(
  index: number,
  z: number,
  corridorH: number,
  isHome: boolean,
  doorColor = 0xf5f5f5
): DetailedDoorParts {
  const group = new THREE.Group();
  group.position.set(0, 0, z);

  addMesh(group, box(0.11, corridorH, 0.64, 0.025), aptWallMat(), 0, corridorH / 2, 0);
  addMesh(group, box(0.54, 0.09, 0.11, 0.02), aptTrimMat(), 0, corridorH - 0.12, 0.05);
  addMesh(group, box(0.5, 0.05, 0.07, 0.015), aptWoodMat(true), 0, corridorH - 0.16, 0.06);

  const recess = addMesh(group, box(0.52, 1.88, 0.08, 0.02), aptMat(0xe8e4e8), 0, 0.98, 0.04);
  recess.name = "door-recess";

  const pivot = new THREE.Group();
  pivot.name = "door-pivot";
  pivot.position.set(-0.24, 0.98, 0.04);

  const doorLeaf = addMesh(pivot, box(0.46, 1.86, 0.075, 0.025), aptMat(doorColor), 0.22, 0, 0);
  doorLeaf.name = "door-leaf";
  addMesh(pivot, box(0.045, 0.14, 0.045, 0.012), aptMetalMat(true), 0.38, -0.05, 0.045);
  addMesh(pivot, box(0.46, 0.08, 0.09, 0.02), aptWoodMat(), 0.22, -0.88, 0.025);

  const peep = new THREE.Mesh(
    new THREE.CircleGeometry(0.032, 12),
    new THREE.MeshStandardMaterial({ color: 0x334455, metalness: 0.6, roughness: 0.2 })
  );
  peep.position.set(0.32, 0.18, 0.045);
  peep.name = "door-peephole";
  pivot.add(peep);

  const innerGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.32, 0.58),
    new THREE.MeshBasicMaterial({ color: 0xfff4d8, transparent: true, opacity: isHome ? 0.42 : 0 })
  );
  innerGlow.name = "door-inner-glow";
  innerGlow.position.set(0.38, 0.05, 0.04);
  pivot.add(innerGlow);

  group.add(pivot);

  addMesh(group, box(0.12, 0.1, 0.08, 0.02), aptMat(0x3a5a8a), -0.3, 0.58, 0.07);
  const mailbox = group.children[group.children.length - 1];
  mailbox.name = "mailbox";

  const bell = addMesh(group, box(0.06, 0.06, 0.035, 0.012), aptMetalMat(true), 0.3, 1.08, 0.07);
  bell.name = "door-bell";
  addMesh(group, box(0.04, 0.02, 0.02, 0.005), aptMat(0xffffff), 0.3, 1.08, 0.09);

  const knocker = addMesh(group, box(0.07, 0.07, 0.045, 0.015), aptMetalMat(true), -0.1, 1.08, 0.07);
  knocker.name = "door-knocker";
  addMesh(group, box(0.04, 0.04, 0.03, 0.01), aptWoodMat(true), -0.1, 1.08, 0.09);

  const plate = addMesh(group, box(0.4, 0.14, 0.035, 0.01), aptMat(isHome ? APT_ART.accentSoft : 0xffffff), 0, 1.58, 0.06);
  plate.name = "nameplate";

  const led = new THREE.Mesh(
    new THREE.CircleGeometry(0.042, 12),
    new THREE.MeshBasicMaterial({ color: 0x94a3b8 })
  );
  led.name = "door-status-led";
  led.position.set(0.24, 1.38, 0.06);
  group.add(led);

  void index;
  return { group, pivot, led, bell, knocker, innerGlow, peephole: peep };
}

export function buildDetailedFireExtinguisher(): THREE.Group {
  const g = new THREE.Group();
  g.name = "corridor-fire-extinguisher";
  g.userData.interact = "fire-extinguisher";
  addMesh(g, box(0.1, 0.38, 0.1, 0.02), aptMat(0xcc2222), 0, 0.22, 0);
  addMesh(g, box(0.08, 0.08, 0.08, 0.02), aptMat(0x111111), 0, 0.44, 0);
  addMesh(g, box(0.04, 0.12, 0.04, 0.01), aptMat(0x222222), 0.04, 0.38, 0);
  addMesh(g, box(0.14, 0.18, 0.02, 0.005), aptMat(0xffffff), 0, 0.28, 0.055);
  return g;
}

export function buildDetailedCctv(): THREE.Group {
  const g = new THREE.Group();
  g.name = "corridor-cctv";
  g.userData.interact = "cctv";
  addMesh(g, box(0.1, 0.06, 0.08, 0.015), aptMat(0x333344), 0, 0, 0);
  const lens = addMesh(g, box(0.04, 0.04, 0.05, 0.01), aptMat(0x111122, { metalness: 0.3 }), 0, -0.02, 0.05);
  lens.name = "cctv-lens";
  addMesh(g, box(0.02, 0.02, 0.02, 0.005), new THREE.MeshBasicMaterial({ color: 0xff3333 }), 0.03, 0.02, 0.02);
  return g;
}

export function buildDetailedCorridorSign(floorIndex: number): THREE.Group {
  const g = new THREE.Group();
  g.name = "corridor-sign";
  g.userData.interact = "sign";
  addMesh(g, box(0.42, 0.28, 0.035, 0.012), aptMat(0xffffff), 0, 0, 0);
  addMesh(g, box(0.36, 0.2, 0.01, 0.005), aptMat(APT_ART.signBlue), 0, 0, 0.02);
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#4488cc";
  ctx.fillRect(0, 0, 128, 64);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 26px system-ui,sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${floorIndex}F`, 64, 32);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 0.16),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true })
  );
  label.position.set(0, 0, 0.022);
  g.add(label);
  return g;
}

export function buildDetailedPlanter(): THREE.Group {
  const g = new THREE.Group();
  g.name = "corridor-planter";
  addMesh(g, box(0.16, 0.14, 0.16, 0.03), aptMat(APT_ART.plantPot), 0, 0.08, 0);
  addMesh(g, box(0.12, 0.04, 0.12, 0.02), aptWoodMat(true), 0, 0.17, 0);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 8),
      aptMat(i % 2 === 0 ? APT_ART.plant : 0x98d8a8)
    );
    leaf.name = "plant-leaves";
    leaf.position.set(Math.cos(a) * 0.06, 0.26 + (i % 2) * 0.04, Math.sin(a) * 0.06);
    g.add(leaf);
  }
  return g;
}

export function buildDetailedRailing(len: number): THREE.Group {
  const g = new THREE.Group();
  g.name = "corridor-railing";
  addMesh(g, box(len, 0.04, 0.06, 0.01), METAL_DARK(), 0, 0.85, 0);
  for (let i = 0; i < Math.floor(len / 0.5); i++) {
    addMesh(g, box(0.03, 0.7, 0.03, 0.008), METAL(), -len / 2 + 0.25 + i * 0.5, 0.5, 0);
  }
  return g;
}

function makeFloorDisplayMesh(floor: number): THREE.Mesh {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = "#22c55e";
  ctx.lineWidth = 3;
  ctx.strokeRect(3, 3, 58, 58);
  ctx.fillStyle = "#22c55e";
  ctx.font = "bold 26px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(floor), 32, 34);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.16), new THREE.MeshBasicMaterial({ map: tex }));
}

export function updateElevatorFloorDisplay(root: THREE.Object3D, floor: number) {
  const num = root.getObjectByName("elevator-floor-number") as THREE.Mesh | undefined;
  if (!num || !(num.material instanceof THREE.MeshBasicMaterial)) return;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = "#22c55e";
  ctx.lineWidth = 3;
  ctx.strokeRect(3, 3, 58, 58);
  ctx.fillStyle = "#22c55e";
  ctx.font = "bold 26px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(Math.round(floor)), 32, 34);
  const old = num.material.map;
  num.material.map = new THREE.CanvasTexture(canvas);
  num.material.map.colorSpace = THREE.SRGBColorSpace;
  num.material.needsUpdate = true;
  if (old) old.dispose();
}

/** 문 상태에 따라 내부 조명·LED 갱신 */
export function syncDoorVisuals(
  parts: Pick<DetailedDoorParts, "led" | "innerGlow">,
  state: "open" | "closed" | "locked"
) {
  if (parts.led.material instanceof THREE.MeshBasicMaterial) {
    parts.led.material.color.setHex(
      state === "open" ? 0x4ade80 : state === "locked" ? 0xef4444 : 0x94a3b8
    );
  }
  if (parts.innerGlow.material instanceof THREE.MeshBasicMaterial) {
    parts.innerGlow.material.opacity = state === "open" ? 0.48 : 0;
  }
}
