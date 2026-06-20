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
  shadow = false
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
  const kinds = ["sofa", "plant", "tv_stand", "coffee_table", "bed", "desk", "refrigerator", "monitor"] as const;
  const count = 2 + (seed % 2);
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

export function buildUnitFurniture(
  items: BondeePlacedItem[],
  rooms: AptRoom[],
  scale = 0.72,
  furnitureMode: "full" | "instanced" = "full"
): THREE.Group {
  const migrated = migrateItems(items, rooms);
  const s = fitScaleToBox(DOLLHOUSE_UNIT_W * 0.88, DOLLHOUSE_UNIT_D * 0.88);
  return buildHomeFloorGroup({
    rooms,
    items: migrated,
    scale: s,
    wallHeight: 0.22,
    furnitureMode,
    wallStyle: "dollhouse-open",
  });
}

export type DollhouseUnitOptions = {
  floorIndex: number;
  active: boolean;
  visited: boolean;
  room?: BondeeHomeState;
  rooms?: AptRoom[];
  seed?: number;
  resident?: {
    userId: string;
    username: string;
    displayName: string;
    homeFloor: number;
    doorOpen: boolean;
  };
  isHomeFloor?: boolean;
  /** full = furniture + decor, minimal = legacy alias, opaque = solid white block */
  detail?: "full" | "minimal" | "opaque";
};

function addEntranceDoorMesh(
  g: THREE.Group,
  floorIndex: number,
  resident: NonNullable<DollhouseUnitOptions["resident"]>,
  doorY: number,
  doorZ: number
) {
  const open = resident.doorOpen;
  const doorGroup = new THREE.Group();
  doorGroup.position.set(0.55, doorY, doorZ);
  doorGroup.userData.floor = floorIndex;
  doorGroup.userData.resident = resident;
  doorGroup.userData.doorOpen = open;
  doorGroup.name = "entrance-door";

  const pivot = new THREE.Group();
  pivot.name = "entrance-door-pivot";
  pivot.position.set(-0.18, 0, 0);
  doorGroup.add(pivot);

  const door = new THREE.Mesh(
    roundedBox(0.42, 0.72, 0.06, 0.03),
    pastelMat(open ? 0xd4e8ff : PASTEL.elevatorDoor)
  );
  door.position.set(0.18, 0, 0);
  pivot.add(door);

  const peephole = new THREE.Mesh(
    new THREE.CircleGeometry(0.025, 8),
    new THREE.MeshBasicMaterial({ color: 0x334455 })
  );
  peephole.position.set(0.28, 0.12, 0.04);
  pivot.add(peephole);

  const status = new THREE.Mesh(
    new THREE.CircleGeometry(0.05, 10),
    new THREE.MeshBasicMaterial({ color: open ? 0x4ade80 : 0x94a3b8, transparent: true, opacity: 0.9 })
  );
  status.name = "door-status-led";
  status.position.set(0.22, 0.38, 0.04);
  doorGroup.add(status);

  pivot.rotation.y = open ? Math.PI / 2.4 : 0;
  g.add(doorGroup);

  const frame = new THREE.Mesh(
    roundedBox(0.52, 0.78, 0.08, 0.02),
    pastelMat(PASTEL.shellTrim)
  );
  frame.position.set(0.55, doorY, doorZ - 0.02);
  g.add(frame);

  const nameplate = new THREE.Mesh(
    roundedBox(0.5, 0.14, 0.04, 0.02),
    pastelMat(open ? PASTEL.highlight : 0xe2e8f0)
  );
  nameplate.position.set(0.55, doorY + 0.44, doorZ + 0.01);
  nameplate.userData.floor = floorIndex;
  nameplate.userData.resident = resident;
  g.add(nameplate);

  const mailbox = new THREE.Mesh(
    roundedBox(0.12, 0.1, 0.08, 0.02),
    pastelMat(0x3a5a8a)
  );
  mailbox.position.set(-0.35, doorY + 0.08, doorZ + 0.04);
  g.add(mailbox);
}

/** Solid white block — neighbor floors & non-active units (no see-through) */
function buildOpaqueNeighborUnit(opts: DollhouseUnitOptions): THREE.Group {
  const { floorIndex, active, resident, isHomeFloor } = opts;
  const g = new THREE.Group();
  g.userData.floor = floorIndex;

  const white = pastelMat(0xffffff);
  addMesh(
    g,
    roundedBox(DOLLHOUSE_UNIT_W, DOLLHOUSE_FLOOR_H * 0.96, DOLLHOUSE_UNIT_D, 0.04),
    white,
    0,
    DOLLHOUSE_FLOOR_H * 0.48,
    0
  );

  const badge = new THREE.Mesh(
    roundedBox(0.55, 0.28, 0.06, 0.04),
    pastelMat(active ? PASTEL.highlight : 0xf5f5f5)
  );
  badge.position.set(-DOLLHOUSE_UNIT_W / 2 + 0.45, DOLLHOUSE_FLOOR_H * 0.78, DOLLHOUSE_UNIT_D / 2 - 0.05);
  g.add(badge);

  if (resident && !isHomeFloor) {
    addEntranceDoorMesh(g, floorIndex, resident, DOLLHOUSE_FLOOR_H * 0.38, DOLLHOUSE_UNIT_D / 2 - 0.02);
  }

  const pick = new THREE.Mesh(
    new THREE.BoxGeometry(DOLLHOUSE_UNIT_W, DOLLHOUSE_FLOOR_H * 0.5, DOLLHOUSE_UNIT_D),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  pick.position.y = DOLLHOUSE_FLOOR_H * 0.25;
  pick.userData.floor = floorIndex;
  g.add(pick);

  return g;
}

/** Single apartment unit — open front cross-section with visible furniture */
export function buildDollhouseUnit(opts: DollhouseUnitOptions): THREE.Group {
  const detail = opts.detail ?? (opts.active ? "full" : "opaque");
  if (detail === "opaque" || detail === "minimal") return buildOpaqueNeighborUnit(opts);

  const { floorIndex, active, visited, room, rooms, seed = floorIndex * 17, resident, isHomeFloor } = opts;
  const g = new THREE.Group();
  g.userData.floor = floorIndex;

  const planRooms = rooms ?? [];
  const items =
    room?.items?.length
      ? migrateItems(room.items, planRooms.length ? planRooms : [{ id: "living", type: "living", x: 0, y: 0, w: 500, h: 300, label: "", locked: false, floor: "wood" }])
      : seededRoomItems(seed);

  if (planRooms.length > 0) {
    const furnitureMode = active ? "full" : "instanced";
    const home = buildUnitFurniture(items, planRooms, 0.72, furnitureMode);
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

  // Per-floor window glow (different interior mood per floor)
  const glowColors = [0xffe0ec, 0xd4f0e8, 0xe8e0ff, 0xffecd9, 0xd8eeff, 0xfff0d8, 0xffe8f0];
  const glowColor = glowColors[floorIndex % glowColors.length];
  for (const side of [-1, 1] as const) {
    const winGlow = new THREE.Mesh(
      new THREE.CircleGeometry(0.09, 12),
      new THREE.MeshBasicMaterial({ color: glowColor, transparent: true, opacity: active ? 0.55 : 0.28 })
    );
    winGlow.rotation.y = side * Math.PI / 2;
    winGlow.position.set(side * (DOLLHOUSE_UNIT_W / 2 - 0.02), DOLLHOUSE_FLOOR_H * 0.55, 0.2);
    g.add(winGlow);
  }

  // Balcony plant pots on active/visited floors
  if (active || visited) {
    for (const x of [-0.9, 0.9]) {
      const pot = new THREE.Mesh(
        roundedBox(0.12, 0.1, 0.12, 0.03),
        pastelMat(PASTEL.wallMint)
      );
      pot.position.set(x, DOLLHOUSE_FLOOR_H * 0.82, DOLLHOUSE_UNIT_D / 2 - 0.08);
      g.add(pot);
      const leaf = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 8, 8),
        pastelMat(0x98d8a8)
      );
      leaf.position.set(x, DOLLHOUSE_FLOOR_H * 0.9, DOLLHOUSE_UNIT_D / 2 - 0.08);
      g.add(leaf);
    }
  }

  // Corridor light strip between units
  const corridorLight = new THREE.Mesh(
    roundedBox(0.12, 0.05, DOLLHOUSE_UNIT_D * 0.65, 0.02),
    new THREE.MeshBasicMaterial({ color: 0xfff8e8, transparent: true, opacity: 0.55 })
  );
  corridorLight.name = "corridor-light";
  corridorLight.position.set(-DOLLHOUSE_UNIT_W / 2 - 0.12, DOLLHOUSE_FLOOR_H * 0.92, 0);
  g.add(corridorLight);

  // Balcony railing
  for (const x of [-0.95, 0.95]) {
    addMesh(
      g,
      roundedBox(0.04, 0.14, DOLLHOUSE_UNIT_D * 0.55, 0.015),
      pastelMat(PASTEL.shellTrim),
      x,
      DOLLHOUSE_FLOOR_H * 0.82,
      DOLLHOUSE_UNIT_D / 2 - 0.06
    );
    for (let z = -0.35; z <= 0.35; z += 0.18) {
      addMesh(
        g,
        roundedBox(0.03, 0.1, 0.03, 0.01),
        pastelMat(PASTEL.shellTrim),
        x,
        DOLLHOUSE_FLOOR_H * 0.86,
        DOLLHOUSE_UNIT_D / 2 - 0.06 + z
      );
    }
  }

  // Floor number plaque
  const floorNum = new THREE.Mesh(
    roundedBox(0.38, 0.22, 0.04, 0.02),
    pastelMat(active ? PASTEL.highlight : 0xffffff)
  );
  floorNum.name = "floor-plaque";
  floorNum.position.set(-DOLLHOUSE_UNIT_W / 2 + 0.35, DOLLHOUSE_FLOOR_H * 0.55, DOLLHOUSE_UNIT_D / 2 - 0.02);
  g.add(floorNum);

  // Front lip
  addMesh(
    g,
    roundedBox(DOLLHOUSE_UNIT_W, 0.06, 0.06, 0.02),
    pastelMat(PASTEL.shellTrim),
    0,
    DOLLHOUSE_FLOOR_H * 0.88,
    DOLLHOUSE_UNIT_D / 2 - 0.03
  );

  // Ceiling slab — opaque so upper floors don't show through
  addMesh(
    g,
    roundedBox(DOLLHOUSE_UNIT_W + 0.04, 0.05, DOLLHOUSE_UNIT_D + 0.04, 0.02),
    pastelMat(0xffffff),
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

  // Entrance door for occupied units (click → visit / profile)
  if (resident && !isHomeFloor) {
    addEntranceDoorMesh(g, floorIndex, resident, DOLLHOUSE_FLOOR_H * 0.38, DOLLHOUSE_UNIT_D / 2 - 0.02);
  }

  return g;
}

/** Ground lobby / building entrance */
export function buildLobbyEntrance(): THREE.Group {
  const g = new THREE.Group();
  g.name = "lobby-entrance";

  const totalW = DOLLHOUSE_UNIT_W + DOLLHOUSE_ELEVATOR_W + 0.5;
  const lobbyH = DOLLHOUSE_FLOOR_H * 0.85;

  addMesh(
    g,
    roundedBox(totalW + 0.8, 0.12, DOLLHOUSE_UNIT_D + 1.2, 0.06),
    pastelMat(PASTEL.shellTrim),
    0,
    -0.06,
    0.2
  );

  addMesh(
    g,
    roundedBox(totalW * 0.55, lobbyH, 0.14, 0.04),
    pastelMat(PASTEL.shell),
    0,
    lobbyH / 2,
    DOLLHOUSE_UNIT_D / 2 + 0.35
  );

  for (const x of [-0.55, 0.55]) {
    addMesh(
      g,
      roundedBox(0.5, lobbyH * 0.92, 0.08, 0.03),
      pastelMat(PASTEL.glass, { transparent: true, opacity: 0.55 }),
      x,
      lobbyH / 2,
      DOLLHOUSE_UNIT_D / 2 + 0.38
    );
  }

  addMesh(
    g,
    roundedBox(totalW + 0.4, 0.08, 0.35, 0.03),
    pastelMat(PASTEL.accent),
    0,
    lobbyH + 0.04,
    DOLLHOUSE_UNIT_D / 2 + 0.55
  );

  const awning = new THREE.Mesh(
    roundedBox(totalW + 0.6, 0.06, 0.9, 0.03),
    pastelMat(PASTEL.wallPeach)
  );
  awning.position.set(0, lobbyH + 0.12, DOLLHOUSE_UNIT_D / 2 + 0.7);
  awning.rotation.x = -0.12;
  g.add(awning);

  return g;
}

/** Penthouse crown at the top of the tower */
export function buildPenthouseCap(): THREE.Group {
  const g = new THREE.Group();
  g.name = "penthouse-cap";

  const totalW = DOLLHOUSE_UNIT_W + DOLLHOUSE_ELEVATOR_W + 0.5;

  addMesh(
    g,
    roundedBox(totalW + 0.5, 0.35, DOLLHOUSE_UNIT_D + 0.6, 0.1),
    pastelMat(PASTEL.accent),
    0,
    0.18,
    0
  );

  addMesh(
    g,
    roundedBox(totalW * 0.7, 0.22, DOLLHOUSE_UNIT_D * 0.5, 0.08),
    pastelMat(PASTEL.wallLavender),
    0,
    0.55,
    0
  );

  for (const side of [-1, 1] as const) {
    const spire = new THREE.Mesh(
      roundedBox(0.12, 0.45, 0.12, 0.04),
      pastelMat(PASTEL.highlight)
    );
    spire.position.set(side * totalW * 0.35, 0.85, 0);
    g.add(spire);
  }

  const star = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.16, 0),
    pastelMat(0xffd700, { metalness: 0.35, roughness: 0.4 })
  );
  star.position.set(0, 1.05, 0);
  g.add(star);

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
  // Floor indicator on car front
  const floorPanel = new THREE.Mesh(
    roundedBox(DOLLHOUSE_ELEVATOR_W * 0.38, DOLLHOUSE_FLOOR_H * 0.14, 0.03, 0.02),
    pastelMat(0xffffff)
  );
  floorPanel.position.set(0, DOLLHOUSE_FLOOR_H * 0.52, DOLLHOUSE_ELEVATOR_W * 0.42);
  floorPanel.name = "elevator-floor-panel";
  car.add(floorPanel);

  const doorHalfW = DOLLHOUSE_ELEVATOR_W * 0.38;
  const doorH = DOLLHOUSE_FLOOR_H * 0.58;
  const doorZ = DOLLHOUSE_ELEVATOR_W * 0.41;
  const doorL = new THREE.Mesh(
    roundedBox(doorHalfW, doorH, 0.04, 0.02),
    pastelMat(PASTEL.elevatorDoor, { metalness: 0.12, roughness: 0.35 })
  );
  doorL.name = "elevator-door-left";
  doorL.position.set(-doorHalfW * 0.45, DOLLHOUSE_FLOOR_H * 0.38, doorZ);
  car.add(doorL);

  const doorR = new THREE.Mesh(
    roundedBox(doorHalfW, doorH, 0.04, 0.02),
    pastelMat(PASTEL.elevatorDoor, { metalness: 0.12, roughness: 0.35 })
  );
  doorR.name = "elevator-door-right";
  doorR.position.set(doorHalfW * 0.45, DOLLHOUSE_FLOOR_H * 0.38, doorZ);
  car.add(doorR);

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

/** Outer dollhouse shell — apartment building exterior with corridor hall */
export function buildDollhouseShell(floorCount: number): THREE.Group {
  const g = new THREE.Group();
  g.name = "dollhouse-shell";

  const h = floorCount * DOLLHOUSE_FLOOR_H;
  const totalW = DOLLHOUSE_UNIT_W + DOLLHOUSE_ELEVATOR_W + 0.5;
  const totalD = DOLLHOUSE_UNIT_D + 0.3;
  const corridorW = 0.55;

  // Base platform with entrance steps
  addMesh(
    g,
    roundedBox(totalW + corridorW + 0.8, 0.18, totalD + 0.8, 0.08),
    pastelMat(PASTEL.shellTrim),
    -corridorW / 2,
    -0.09,
    0.15
  );
  for (const step of [0, 1, 2]) {
    addMesh(
      g,
      roundedBox(totalW + 0.4 - step * 0.15, 0.05, 0.35 - step * 0.08, 0.02),
      pastelMat(PASTEL.floorWoodAlt),
      0,
      0.025 + step * 0.05,
      totalD / 2 + 0.55 + step * 0.12
    );
  }

  // Corridor hall — shared hallway
  addMesh(
    g,
    roundedBox(corridorW, h + 0.15, totalD + 0.15, 0.04),
    pastelMat(0xf8f0f4),
    -totalW / 2 - corridorW / 2 - 0.08,
    h / 2,
    0
  );

  // Corridor ceiling lights per visible floor
  for (let f = 0; f < floorCount; f++) {
    const ly = f * DOLLHOUSE_FLOOR_H + DOLLHOUSE_FLOOR_H * 0.88;
    const light = new THREE.Mesh(
      roundedBox(corridorW * 0.7, 0.04, 0.12, 0.015),
      new THREE.MeshBasicMaterial({ color: 0xfff4d8, transparent: true, opacity: 0.65 })
    );
    light.name = "corridor-ceiling-light";
    light.userData.floorIndex = f;
    light.position.set(-totalW / 2 - corridorW / 2 - 0.08, ly, 0.15);
    g.add(light);
  }

  // Left exterior wall with windows
  addMesh(
    g,
    roundedBox(0.1, h + 0.2, totalD, 0.04),
    pastelMat(PASTEL.shell),
    -totalW / 2 - corridorW - 0.06,
    h / 2,
    0
  );

  for (let f = 0; f < floorCount; f++) {
    const wy = f * DOLLHOUSE_FLOOR_H + DOLLHOUSE_FLOOR_H * 0.55;
    for (const z of [-0.35, 0.35]) {
      const winFrame = new THREE.Mesh(
        roundedBox(0.06, 0.28, 0.22, 0.015),
        pastelMat(PASTEL.shellTrim)
      );
      winFrame.position.set(-totalW / 2 - corridorW - 0.04, wy, z);
      g.add(winFrame);
      const winGlass = new THREE.Mesh(
        roundedBox(0.04, 0.22, 0.16, 0.01),
        pastelMat(PASTEL.glass, { transparent: true, opacity: 0.45 })
      );
      winGlass.name = "exterior-window";
      winGlass.userData.floorIndex = f;
      winGlass.position.set(-totalW / 2 - corridorW - 0.035, wy, z);
      g.add(winGlass);
    }
  }

  // Wall art / notice board in corridor
  const sign = new THREE.Mesh(
    roundedBox(0.28, 0.2, 0.03, 0.02),
    pastelMat(0xffffff)
  );
  sign.position.set(-totalW / 2 - corridorW / 2 - 0.08, DOLLHOUSE_FLOOR_H * 0.55, -totalD / 2 + 0.12);
  g.add(sign);
  addMesh(
    g,
    roundedBox(0.22, 0.14, 0.01, 0.005),
    pastelMat(PASTEL.wallPeach),
    -totalW / 2 - corridorW / 2 - 0.08,
    DOLLHOUSE_FLOOR_H * 0.55,
    -totalD / 2 + 0.14
  );

  // Roof cap
  addMesh(
    g,
    roundedBox(totalW + corridorW + 0.4, 0.22, totalD + 0.2, 0.08),
    pastelMat(PASTEL.accent),
    -corridorW / 2,
    h + 0.12,
    0
  );

  // Rooftop plants
  for (const x of [-0.8, 0.3, 1.0]) {
    const pot = new THREE.Mesh(
      roundedBox(0.14, 0.12, 0.14, 0.03),
      pastelMat(PASTEL.wallMint)
    );
    pot.position.set(x, h + 0.28, 0.2);
    g.add(pot);
    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 8, 8),
      pastelMat(0x98d8a8)
    );
    leaf.position.set(x, h + 0.38, 0.2);
    g.add(leaf);
  }

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
