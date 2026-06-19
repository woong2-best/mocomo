"use client";

import * as THREE from "three";
import type { BondeeFurnitureKind, BondeePlacedItem } from "./types";
import {
  addTo,
  bondeeGlowMat,
  bondeeMat,
  roundedBox,
  shadowizeGroup,
  BONDEE_PALETTE,
} from "./bondee-mesh-utils";

const GRID = 0.55;

export function gridToWorld(gx: number, gz: number) {
  return { x: gx * GRID, z: gz * GRID };
}

const FURNITURE_PROTOTYPES = new Map<BondeeFurnitureKind, THREE.Group>();

export function buildFurnitureMesh(kind: BondeeFurnitureKind): THREE.Group {
  let proto = FURNITURE_PROTOTYPES.get(kind);
  if (!proto) {
    proto = buildFurnitureMeshPrototype(kind);
    FURNITURE_PROTOTYPES.set(kind, proto);
  }
  return proto.clone(true);
}

function buildFurnitureMeshPrototype(kind: BondeeFurnitureKind): THREE.Group {
  const g = new THREE.Group();
  g.userData.kind = kind;

  switch (kind) {
    case "sofa":
      buildSofa(g);
      break;
    case "bed":
      buildBed(g);
      break;
    case "tv_stand":
      buildTvStand(g);
      break;
    case "coffee_table":
      buildCoffeeTable(g);
      break;
    case "bookshelf":
      buildBookshelf(g);
      break;
    case "floor_lamp":
      buildFloorLamp(g);
      break;
    case "plant":
      buildPlant(g);
      break;
    case "desk":
      buildDesk(g);
      break;
    case "treadmill":
      buildTreadmill(g);
      break;
    case "ac":
      buildAc(g);
      break;
    case "clock":
      buildClock(g);
      break;
    case "rug":
      buildRug(g);
      break;
    case "washer":
      buildWasher(g);
      break;
    case "hoop":
      buildHoop(g);
      break;
    case "shelf_small":
      buildShelfSmall(g);
      break;
  }

  shadowizeGroup(g, false);
  return g;
}

function buildSofa(g: THREE.Group) {
  const pink = bondeeMat(0xffb8c8);
  const pinkDark = bondeeMat(0xff9eb8);
  const cushion = bondeeMat(0xffd8e4);
  const leg = bondeeMat(BONDEE_PALETTE.woodDark);

  addTo(g, roundedBox(0.88, 0.22, 0.48, 0.06), pink, 0, 0.14, 0);
  addTo(g, roundedBox(0.88, 0.38, 0.14, 0.05), pinkDark, 0, 0.34, -0.18);
  for (const x of [-0.28, 0, 0.28]) {
    addTo(g, roundedBox(0.24, 0.1, 0.32, 0.04), cushion, x, 0.28, 0.02);
  }
  for (const x of [-0.38, 0.38]) {
    addTo(g, roundedBox(0.12, 0.28, 0.42, 0.05), pinkDark, x, 0.26, 0);
  }
  addTo(g, roundedBox(0.14, 0.14, 0.14, 0.04), bondeeMat(0xffe8a0), 0.32, 0.32, 0.08);
  for (const [x, z] of [[-0.32, -0.16], [0.32, -0.16], [-0.32, 0.16], [0.32, 0.16]] as const) {
    addTo(g, roundedBox(0.06, 0.08, 0.06, 0.02), leg, x, 0.04, z);
  }
}

function buildBed(g: THREE.Group) {
  const frame = bondeeMat(BONDEE_PALETTE.wallLavender);
  const mattress = bondeeMat(0xf8f4ff);
  const blanket = bondeeMat(0xffc8dc);
  const pillow = bondeeMat(0xffffff);
  const leg = bondeeMat(BONDEE_PALETTE.wood);

  addTo(g, roundedBox(0.78, 0.14, 0.95, 0.04), frame, 0, 0.1, 0);
  addTo(g, roundedBox(0.72, 0.12, 0.88, 0.05), mattress, 0, 0.2, 0.02);
  addTo(g, roundedBox(0.68, 0.06, 0.55, 0.04), blanket, 0, 0.28, 0.12);
  addTo(g, roundedBox(0.06, 0.04, 0.55, 0.02), bondeeMat(0xffe0ec), 0, 0.31, 0.12);
  for (const x of [-0.2, 0.2]) {
    addTo(g, roundedBox(0.22, 0.08, 0.16, 0.04), pillow, x, 0.28, -0.32);
  }
  addTo(g, roundedBox(0.76, 0.1, 0.08, 0.03), frame, 0, 0.22, -0.44);
  for (const [x, z] of [[-0.32, -0.38], [0.32, -0.38], [-0.32, 0.38], [0.32, 0.38]] as const) {
    addTo(g, roundedBox(0.07, 0.1, 0.07, 0.02), leg, x, 0.05, z);
  }
}

function buildTvStand(g: THREE.Group) {
  const white = bondeeMat(0xfaf8f5);
  const wood = bondeeMat(BONDEE_PALETTE.woodDark);

  addTo(g, roundedBox(0.62, 0.32, 0.28, 0.04), white, 0, 0.18, 0);
  addTo(g, roundedBox(0.58, 0.04, 0.24, 0.02), wood, 0, 0.34, 0);
  for (const x of [-0.18, 0.18]) {
    addTo(g, roundedBox(0.22, 0.06, 0.2, 0.02), bondeeMat(0xf0ece8), x, 0.28, 0.02);
  }
  addTo(g, roundedBox(0.68, 0.4, 0.05, 0.02), bondeeMat(0x1a1a22, { roughness: 0.15 }), 0, 0.58, 0.04);
  addTo(g, roundedBox(0.58, 0.32, 0.02, 0.01), bondeeGlowMat(0x88ccff, 0.5), 0, 0.57, 0.08);
  addTo(g, roundedBox(0.24, 0.07, 0.15, 0.025), bondeeMat(0x3a3a4a), 0.14, 0.4, 0.2);
  addTo(g, roundedBox(0.05, 0.025, 0.025, 0.008), bondeeGlowMat(0x44ff88, 0.9), 0.14, 0.44, 0.2);
  addTo(g, roundedBox(0.08, 0.02, 0.04, 0.008), bondeeMat(0x222222), -0.2, 0.36, 0.18);
  g.userData.interactKind = "game_console";
}

function buildCoffeeTable(g: THREE.Group) {
  addTo(g, roundedBox(0.5, 0.05, 0.34, 0.025), bondeeMat(BONDEE_PALETTE.wood), 0, 0.24, 0);
  for (const [x, z] of [[-0.18, -0.12], [0.18, -0.12], [-0.18, 0.12], [0.18, 0.12]] as const) {
    addTo(g, roundedBox(0.05, 0.2, 0.05, 0.015), bondeeMat(BONDEE_PALETTE.woodDark), x, 0.1, z);
  }
  addTo(g, roundedBox(0.06, 0.07, 0.06, 0.02), bondeeMat(0xffffff), -0.08, 0.29, 0);
  addTo(g, roundedBox(0.1, 0.02, 0.07, 0.008), bondeeMat(0xffd8a8), 0.1, 0.275, 0.04);
}

function buildBookshelf(g: THREE.Group) {
  addTo(g, roundedBox(0.92, 1.08, 0.3, 0.04), bondeeMat(BONDEE_PALETTE.wood), 0, 0.56, 0);
  for (let row = 0; row < 4; row++) {
    addTo(g, roundedBox(0.86, 0.03, 0.26, 0.01), bondeeMat(BONDEE_PALETTE.woodDark), 0, 0.18 + row * 0.24, 0);
    for (let col = 0; col < 4; col++) {
      const colors = [0xff8899, 0x88bbee, 0xaabb66, 0xffcc88, 0xcc99ff, 0x66ccaa];
      addTo(
        g,
        roundedBox(0.07, 0.18, 0.11, 0.012),
        bondeeMat(colors[(row + col) % colors.length]),
        -0.28 + col * 0.19,
        0.28 + row * 0.24,
        0.02
      );
    }
  }
  addTo(g, roundedBox(0.12, 0.14, 0.08, 0.02), bondeeMat(0xffe8a0), 0.28, 0.92, 0.04);
}

function buildFloorLamp(g: THREE.Group) {
  addTo(g, roundedBox(0.14, 0.04, 0.14, 0.02), bondeeMat(BONDEE_PALETTE.woodDark), 0, 0.02, 0);
  addTo(g, roundedBox(0.04, 0.82, 0.04, 0.015), bondeeMat(0x666677), 0, 0.44, 0);
  addTo(g, roundedBox(0.22, 0.16, 0.22, 0.06), bondeeMat(0xfff0d8), 0, 0.88, 0);
  addTo(g, roundedBox(0.16, 0.1, 0.16, 0.04), bondeeGlowMat(0xffe8c0, 0.25), 0, 0.84, 0);
}

function buildPlant(g: THREE.Group) {
  addTo(g, roundedBox(0.18, 0.16, 0.18, 0.04), bondeeMat(0xffc8b0), 0, 0.08, 0);
  addTo(g, roundedBox(0.14, 0.04, 0.14, 0.02), bondeeMat(0x8b6914), 0, 0.18, 0);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 10, 10),
      bondeeMat(i % 2 === 0 ? 0x98d8a8 : 0x7ec898)
    );
    leaf.position.set(Math.cos(a) * 0.1, 0.28 + (i % 2) * 0.06, Math.sin(a) * 0.1);
    leaf.scale.set(1, 1.3, 1);
    leaf.castShadow = true;
    g.add(leaf);
  }
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), bondeeMat(0x88cc99));
  top.position.y = 0.42;
  top.scale.set(1, 1.2, 1);
  top.castShadow = true;
  g.add(top);
}

function buildDesk(g: THREE.Group) {
  addTo(g, roundedBox(0.64, 0.05, 0.38, 0.025), bondeeMat(BONDEE_PALETTE.wood), 0, 0.4, 0);
  addTo(g, roundedBox(0.58, 0.34, 0.32, 0.03), bondeeMat(0xffffff), 0, 0.2, 0);
  addTo(g, roundedBox(0.24, 0.02, 0.16, 0.008), bondeeMat(0xccccdd), 0, 0.44, 0);
  addTo(g, roundedBox(0.22, 0.14, 0.02, 0.008), bondeeMat(0x333344), 0, 0.48, 0);
  addTo(g, roundedBox(0.08, 0.06, 0.06, 0.015), bondeeMat(0xffcc88), 0.2, 0.44, 0.1);
}

function buildTreadmill(g: THREE.Group) {
  addTo(g, roundedBox(0.52, 0.14, 0.92, 0.04), bondeeMat(0x444455), 0, 0.1, 0);
  addTo(g, roundedBox(0.48, 0.02, 0.8, 0.01), bondeeMat(0x666677), 0, 0.18, 0);
  addTo(g, roundedBox(0.46, 0.48, 0.08, 0.03), bondeeMat(0x999999), 0, 0.42, -0.36);
  addTo(g, roundedBox(0.12, 0.04, 0.04, 0.01), bondeeGlowMat(0x44aaff, 0.3), 0, 0.52, -0.34);
}

function buildAc(g: THREE.Group) {
  addTo(g, roundedBox(0.52, 0.2, 0.14, 0.03), bondeeMat(0xffffff), 0, 0.62, 0);
  addTo(g, roundedBox(0.44, 0.04, 0.02, 0.01), bondeeMat(0xe8e8e8), 0, 0.62, 0.08);
  for (let i = 0; i < 5; i++) {
    addTo(g, roundedBox(0.38, 0.008, 0.008, 0.003), bondeeMat(0xf0f0f0), 0, 0.58 - i * 0.028, 0.075);
  }
}

function buildClock(g: THREE.Group) {
  addTo(g, roundedBox(0.04, 0.22, 0.04, 0.01), bondeeMat(BONDEE_PALETTE.wood), 0, 0.48, 0);
  const face = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.04, 20),
    bondeeMat(0xffffff)
  );
  face.rotation.x = Math.PI / 2;
  face.position.y = 0.58;
  face.castShadow = true;
  g.add(face);
  addTo(g, roundedBox(0.01, 0.06, 0.008, 0.003), bondeeMat(0x333333), 0, 0.6, 0.02);
  addTo(g, roundedBox(0.06, 0.008, 0.008, 0.003), bondeeMat(0x333333), 0.02, 0.6, 0.02);
}

function buildRug(g: THREE.Group) {
  addTo(g, roundedBox(0.82, 0.025, 0.62, 0.02), bondeeMat(0xc8a882), 0, 0.012, 0);
  addTo(g, roundedBox(0.68, 0.012, 0.48, 0.015), bondeeMat(0xd8b892, { transparent: true, opacity: 0.7 }), 0, 0.022, 0);
  addTo(g, roundedBox(0.4, 0.008, 0.3, 0.01), bondeeMat(0xffe8d0, { transparent: true, opacity: 0.5 }), 0, 0.028, 0);
}

function buildWasher(g: THREE.Group) {
  addTo(g, roundedBox(0.38, 0.48, 0.38, 0.04), bondeeMat(0xffffff), 0, 0.26, 0);
  const door = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 0.03, 20),
    bondeeMat(0xd8e8f8, { metalness: 0.15, roughness: 0.3 })
  );
  door.rotation.x = Math.PI / 2;
  door.position.set(0, 0.28, 0.2);
  door.castShadow = true;
  g.add(door);
  addTo(g, roundedBox(0.28, 0.04, 0.02, 0.01), bondeeMat(0xe8e8e8), 0, 0.46, 0.18);
}

function buildHoop(g: THREE.Group) {
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.018, 8, 20),
    bondeeMat(0xff6633)
  );
  rim.position.y = 0.72;
  rim.rotation.x = Math.PI / 2;
  rim.castShadow = true;
  g.add(rim);
  addTo(g, roundedBox(0.05, 0.52, 0.32, 0.02), bondeeMat(0x555566), 0, 0.46, -0.1);
  addTo(g, roundedBox(0.24, 0.04, 0.24, 0.02), bondeeMat(BONDEE_PALETTE.woodDark), 0, 0.02, 0);
}

function buildShelfSmall(g: THREE.Group) {
  addTo(g, roundedBox(0.38, 0.52, 0.22, 0.03), bondeeMat(BONDEE_PALETTE.wood), 0, 0.28, 0);
  for (let i = 0; i < 3; i++) {
    addTo(g, roundedBox(0.34, 0.025, 0.18, 0.01), bondeeMat(BONDEE_PALETTE.woodDark), 0, 0.12 + i * 0.18, 0);
    addTo(g, roundedBox(0.06, 0.1, 0.06, 0.01), bondeeMat(0xffaa88), -0.08 + i * 0.08, 0.2 + i * 0.18, 0.04);
  }
}

export function syncRoomFurniture(root: THREE.Group, items: BondeePlacedItem[]) {
  const ids = new Set(items.map((i) => i.id));
  for (let i = root.children.length - 1; i >= 0; i--) {
    const c = root.children[i];
    if (!ids.has(c.userData.placedId as string)) {
      root.remove(c);
      c.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => m.dispose());
        }
      });
    }
  }

  for (const item of items) {
    let node = root.children.find((c) => c.userData.placedId === item.id) as THREE.Group | undefined;
    if (!node) {
      node = buildFurnitureMesh(item.kind);
      node.userData.placedId = item.id;
      root.add(node);
    }
    const { x, z } = gridToWorld(item.gx, item.gz);
    node.position.set(x, 0, z);
    node.rotation.y = (item.rot * Math.PI) / 2;
  }
}
