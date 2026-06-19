"use client";

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import {
  buildHomeFloorGroup,
  defaultItemsForRooms,
  disposeHomeGroup,
  fitScaleToBox,
  migrateItems,
} from "./home-floor-meshes";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import type { BondeePlacedItem, BondeeHomeState } from "./types";

export const DOLLHOUSE_UNIT_W = 3.4;
export const DOLLHOUSE_UNIT_D = 2.2;
export const DOLLHOUSE_FLOOR_H = 2.05;
export const DOLLHOUSE_ELEVATOR_W = 0.85;

/** Pastel palette for dollhouse exterior & interiors */
export const PASTEL = {
  bg: 0xfef6f8,
  shell: 0xffe8f0,
  shellTrim: 0xffc8dc,
  floorWood: 0xf5e6d3,
  floorWoodAlt: 0xe8ddd0,
  wallMint: 0xd4f0e8,
  wallPink: 0xffe0ec,
  wallLavender: 0xe8e0ff,
  wallPeach: 0xffecd9,
  wallSky: 0xd8eeff,
  accent: 0xffb4c8,
  elevator: 0xc8e8f8,
  elevatorDoor: 0xf0f8ff,
  glass: 0xb8e0f0,
  label: 0xffffff,
  highlight: 0xff9ec4,
} as const;

const WALL_COLORS = [
  PASTEL.wallPink,
  PASTEL.wallMint,
  PASTEL.wallLavender,
  PASTEL.wallPeach,
  PASTEL.wallSky,
];

export function pastelMat(
  color: number | string,
  opts?: Partial<THREE.MeshStandardMaterialParameters>
) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.72,
    metalness: 0.02,
    ...opts,
  });
}

function roundedBox(w: number, h: number, d: number, radius = 0.06, seg = 3) {
  return new RoundedBoxGeometry(w, h, d, seg, radius);
}

function addMesh(
  group: THREE.Group,
  geo: THREE.BufferGeometry,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  shadow = true
) {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  if (shadow) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }
  group.add(mesh);
  return mesh;
}

/** Procedural furniture for floors without saved room data */
export function seededRoomItems(seed: number, roomId = "living"): BondeePlacedItem[] {
  const kinds = ["sofa", "plant", "tv_stand", "coffee_table", "bed", "desk", "floor_lamp", "bookshelf"] as const;
  const count = 3 + (seed % 3);
  const items: BondeePlacedItem[] = [];
  for (let i = 0; i < count; i++) {
    const kind = kinds[(seed + i * 7) % kinds.length];
    items.push({
      id: `seed-${seed}-${i}`,
      kind,
      roomId,
      gx: -1 + ((seed + i * 3) % 3),
      gz: -1 + ((seed + i * 5) % 3),
      rot: ((seed + i) % 4) as 0 | 1 | 2 | 3,
    });
  }
  return items;
}

export function buildUnitFurniture(items: BondeePlacedItem[], rooms: AptRoom[], scale = 0.72): THREE.Group {
  const migrated = migrateItems(items, rooms);
  const s = fitScaleToBox(DOLLHOUSE_UNIT_W * 0.88, DOLLHOUSE_UNIT_D * 0.88);
  return buildHomeFloorGroup({ rooms, items: migrated, scale: s, wallHeight: 0.32 });
}

export type DollhouseUnitOptions = {
  floorIndex: number;
  active: boolean;
  visited: boolean;
  room?: BondeeHomeState;
  rooms?: AptRoom[];
  seed?: number;
};

/** Single apartment unit — open front cross-section with visible furniture */
export function buildDollhouseUnit(opts: DollhouseUnitOptions): THREE.Group {
  const { floorIndex, active, visited, room, rooms, seed = floorIndex * 17 } = opts;
  const g = new THREE.Group();
  g.userData.floor = floorIndex;

  const planRooms = rooms ?? [];
  const items =
    room?.items?.length
      ? migrateItems(room.items, planRooms.length ? planRooms : [{ id: "living", type: "living", x: 0, y: 0, w: 500, h: 300, label: "", locked: false, floor: "wood" }])
      : seededRoomItems(seed);

  if (planRooms.length > 0) {
    const home = buildUnitFurniture(items, planRooms);
    home.position.set(0, 0.06, 0);
    g.add(home);
  } else {
    const floorColor = floorIndex % 2 === 0 ? PASTEL.floorWood : PASTEL.floorWoodAlt;
    addMesh(g, roundedBox(DOLLHOUSE_UNIT_W, 0.08, DOLLHOUSE_UNIT_D, 0.04), pastelMat(floorColor), 0, 0.04, 0);
    const wallColor = WALL_COLORS[floorIndex % WALL_COLORS.length];
    addMesh(g, roundedBox(DOLLHOUSE_UNIT_W, DOLLHOUSE_FLOOR_H * 0.88, 0.07, 0.03), pastelMat(wallColor), 0, DOLLHOUSE_FLOOR_H * 0.46, -DOLLHOUSE_UNIT_D / 2 + 0.04);
    const furniture = buildUnitFurniture(items, [{ id: "u", type: "living", x: 0, y: 0, w: 800, h: 500, label: "", locked: false, floor: "wood" }]);
    furniture.position.set(0, 0.08, 0.1);
    g.add(furniture);
  }

  // Front lip
  addMesh(
    g,
    roundedBox(DOLLHOUSE_UNIT_W, 0.06, 0.06, 0.02),
    pastelMat(PASTEL.shellTrim),
    0,
    DOLLHOUSE_FLOOR_H * 0.88,
    DOLLHOUSE_UNIT_D / 2 - 0.03
  );

  // Ceiling slab
  addMesh(
    g,
    roundedBox(DOLLHOUSE_UNIT_W + 0.04, 0.05, DOLLHOUSE_UNIT_D + 0.04, 0.02),
    pastelMat(0xffffff, { transparent: true, opacity: 0.55 }),
    0,
    DOLLHOUSE_FLOOR_H * 0.92,
    0
  );

  // Active floor glow ring
  if (active || visited) {
    const glow = new THREE.Mesh(
      roundedBox(DOLLHOUSE_UNIT_W + 0.12, 0.03, DOLLHOUSE_UNIT_D + 0.12, 0.02),
      new THREE.MeshBasicMaterial({
        color: active ? PASTEL.highlight : PASTEL.accent,
        transparent: true,
        opacity: active ? 0.45 : 0.25,
      })
    );
    glow.position.y = 0.02;
    glow.name = "unit-glow";
    g.add(glow);
  }

  // Floor number badge
  const badge = new THREE.Mesh(
    roundedBox(0.55, 0.28, 0.06, 0.04),
    pastelMat(active ? PASTEL.highlight : 0xffffff)
  );
  badge.position.set(-DOLLHOUSE_UNIT_W / 2 + 0.45, DOLLHOUSE_FLOOR_H * 0.78, DOLLHOUSE_UNIT_D / 2 - 0.05);
  badge.name = "floor-badge";
  g.add(badge);

  // Pick target (invisible slab for raycasting)
  const pick = new THREE.Mesh(
    new THREE.BoxGeometry(DOLLHOUSE_UNIT_W, DOLLHOUSE_FLOOR_H * 0.5, DOLLHOUSE_UNIT_D),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  pick.position.y = DOLLHOUSE_FLOOR_H * 0.25;
  pick.userData.floor = floorIndex;
  g.add(pick);

  return g;
}

export function buildElevatorShaft(totalFloors: number, visibleStart: number, visibleCount: number): THREE.Group {
  const g = new THREE.Group();
  g.name = "elevator-shaft";

  const shaftH = visibleCount * DOLLHOUSE_FLOOR_H;
  const shaftX = DOLLHOUSE_UNIT_W / 2 + DOLLHOUSE_ELEVATOR_W / 2 + 0.15;

  // Glass shaft
  addMesh(
    g,
    roundedBox(DOLLHOUSE_ELEVATOR_W, shaftH, DOLLHOUSE_ELEVATOR_W, 0.05),
    pastelMat(PASTEL.glass, { transparent: true, opacity: 0.35, roughness: 0.15 }),
    shaftX,
    shaftH / 2,
    0
  );

  // Shaft frame
  for (const side of [-1, 1] as const) {
    addMesh(
      g,
      roundedBox(0.06, shaftH, 0.06, 0.02),
      pastelMat(PASTEL.elevator),
      shaftX + side * (DOLLHOUSE_ELEVATOR_W / 2 - 0.03),
      shaftH / 2,
      0
    );
  }

  // Elevator car (position updated externally)
  const car = new THREE.Group();
  car.name = "elevator-car";
  addMesh(
    car,
    roundedBox(DOLLHOUSE_ELEVATOR_W * 0.82, DOLLHOUSE_FLOOR_H * 0.72, DOLLHOUSE_ELEVATOR_W * 0.82, 0.05),
    pastelMat(PASTEL.elevatorDoor),
    0,
    DOLLHOUSE_FLOOR_H * 0.36,
    0
  );
  addMesh(
    car,
    roundedBox(DOLLHOUSE_ELEVATOR_W * 0.5, DOLLHOUSE_FLOOR_H * 0.55, 0.04, 0.03),
    pastelMat(PASTEL.glass, { transparent: true, opacity: 0.5 }),
    0,
    DOLLHOUSE_FLOOR_H * 0.38,
    DOLLHOUSE_ELEVATOR_W * 0.38
  );
  car.position.set(shaftX, 0, 0);
  g.add(car);

  // Call buttons panel
  const panel = new THREE.Mesh(
    roundedBox(0.18, 0.5, 0.06, 0.03),
    pastelMat(PASTEL.shellTrim)
  );
  panel.position.set(shaftX + DOLLHOUSE_ELEVATOR_W / 2 + 0.12, shaftH * 0.55, 0);
  g.add(panel);

  g.userData.shaftX = shaftX;
  g.userData.visibleStart = visibleStart;
  return g;
}

/** Outer dollhouse shell — cute rounded exterior framing the cutaway */
export function buildDollhouseShell(floorCount: number): THREE.Group {
  const g = new THREE.Group();
  g.name = "dollhouse-shell";

  const h = floorCount * DOLLHOUSE_FLOOR_H;
  const totalW = DOLLHOUSE_UNIT_W + DOLLHOUSE_ELEVATOR_W + 0.5;
  const totalD = DOLLHOUSE_UNIT_D + 0.3;

  // Base platform
  addMesh(
    g,
    roundedBox(totalW + 0.6, 0.18, totalD + 0.5, 0.08),
    pastelMat(PASTEL.shellTrim),
    0,
    -0.09,
    0
  );

  // Left exterior wall with round windows
  addMesh(
    g,
    roundedBox(0.1, h + 0.2, totalD, 0.04),
    pastelMat(PASTEL.shell),
    -totalW / 2 - 0.02,
    h / 2,
    0
  );

  // Roof cap
  addMesh(
    g,
    roundedBox(totalW + 0.3, 0.22, totalD + 0.2, 0.08),
    pastelMat(PASTEL.accent),
    0,
    h + 0.12,
    0
  );

  // Cute roof decoration
  const deco = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 8, 8),
    pastelMat(PASTEL.wallMint)
  );
  deco.position.set(-totalW / 4, h + 0.32, 0);
  deco.scale.set(1, 1.3, 1);
  g.add(deco);

  // Back exterior
  addMesh(
    g,
    roundedBox(totalW, h + 0.15, 0.1, 0.04),
    pastelMat(PASTEL.shell),
    0,
    h / 2,
    -totalD / 2 - 0.02
  );

  return g;
}

export function disposeGroup(group: THREE.Object3D) {
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => m.dispose());
    }
  });
}
