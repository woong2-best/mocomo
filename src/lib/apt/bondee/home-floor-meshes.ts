"use client";

import * as THREE from "three";
import { SCALE, roomCenter, roomSize } from "@/lib/apt/building-from-plan";
import { PLAN_H, PLAN_W, type AptRoom, type FloorStyle } from "@/lib/apt/floor-plan-types";
import { buildFurnitureMesh } from "./furniture-meshes";
import type { BondeePlacedItem } from "./types";

const FLOOR_COLORS: Record<FloorStyle, number> = {
  wood: 0xf5e6d3,
  "tile-check": 0xf8f8f8,
  "tile-light": 0xf4f4f4,
  bathroom: 0xd8eeff,
  beige: 0xf6f4f0,
  balcony: 0xe8e8e8,
};

const ROOM_TYPE_COLORS: Record<string, number> = {
  kitchen: 0xffecd9,
  bathroom: 0xd8eeff,
  living: 0xffe0ec,
  bedroom: 0xe8e0ff,
  entrance: 0xf0f8ff,
  hall: 0xf5f5f5,
  balcony: 0xe8f4e8,
};

const WALL_H = 0.42;
const WALL_THICK = 0.04;
const ITEM_GRID = 0.38;

function isExteriorEdge(room: AptRoom, side: "n" | "s" | "e" | "w") {
  const r = { x1: room.x, y1: room.y, x2: room.x + room.w, y2: room.y + room.h };
  if (side === "w" && r.x1 <= 1) return true;
  if (side === "n" && r.y1 <= 1) return true;
  if (side === "s" && r.y2 >= PLAN_H - 1) return true;
  if (side === "e" && r.x2 >= PLAN_W - 1) return true;
  return false;
}

function sharesEdge(a: AptRoom, b: AptRoom, side: "n" | "s" | "e" | "w", tol = 2) {
  const ra = { x1: a.x, y1: a.y, x2: a.x + a.w, y2: a.y + a.h };
  const rb = { x1: b.x, y1: b.y, x2: b.x + b.w, y2: b.y + b.h };
  if (side === "e") return Math.abs(ra.x2 - rb.x1) <= tol && ra.y1 < rb.y2 - tol && ra.y2 > rb.y1 + tol;
  if (side === "w") return Math.abs(ra.x1 - rb.x2) <= tol && ra.y1 < rb.y2 - tol && ra.y2 > rb.y1 + tol;
  if (side === "s") return Math.abs(ra.y2 - rb.y1) <= tol && ra.x1 < rb.x2 - tol && ra.x2 > rb.x1 + tol;
  return Math.abs(ra.y1 - rb.y2) <= tol && ra.x1 < rb.x2 - tol && ra.x2 > rb.x1 + tol;
}

function hasNeighbor(room: AptRoom, rooms: AptRoom[], side: "n" | "s" | "e" | "w") {
  return rooms.some((o) => o.id !== room.id && sharesEdge(room, o, side));
}

function mat(color: number, opts?: Partial<THREE.MeshStandardMaterialParameters>) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.02, ...opts });
}

export function defaultItemsForRooms(rooms: AptRoom[]): BondeePlacedItem[] {
  const items: BondeePlacedItem[] = [];
  const add = (roomId: string, kind: BondeePlacedItem["kind"], gx: number, gz: number) => {
    items.push({ id: `${roomId}-${kind}`, kind, roomId, gx, gz, rot: 0 });
  };
  for (const r of rooms) {
    if (r.type === "living") {
      add(r.id, "sofa", 0, 0);
      add(r.id, "tv_stand", 1, -1);
      add(r.id, "coffee_table", 0, 1);
    } else if (r.type === "kitchen") {
      add(r.id, "shelf_small", 0, 0);
      add(r.id, "desk", -1, 1);
    } else if (r.type === "bedroom") {
      add(r.id, "bed", 0, 0);
      add(r.id, "floor_lamp", -1, 1);
    } else if (r.type === "bathroom") {
      add(r.id, "washer", 0, 0);
    } else if (r.type === "entrance") {
      add(r.id, "plant", 0, 0);
    } else if (r.type === "hall") {
      add(r.id, "rug", 0, 0);
    } else if (r.type === "balcony") {
      add(r.id, "plant", 0, 0);
    }
  }
  return items;
}

export function migrateItems(items: BondeePlacedItem[], rooms: AptRoom[]): BondeePlacedItem[] {
  const living = rooms.find((r) => r.type === "living")?.id ?? rooms[0]?.id ?? "living";
  return items.map((it) => ({
    ...it,
    roomId: it.roomId ?? living,
  }));
}

export function itemWorldPos(item: BondeePlacedItem, room: AptRoom) {
  const c = roomCenter(room);
  return {
    x: c.x + item.gx * ITEM_GRID,
    z: c.z + item.gz * ITEM_GRID,
  };
}

export type HomeFloorBuildOptions = {
  rooms: AptRoom[];
  items: BondeePlacedItem[];
  scale?: number;
  wallHeight?: number;
  showLabels?: boolean;
  highlightRoomId?: string | null;
  selectedItemId?: string | null;
};

export function buildHomeFloorGroup(opts: HomeFloorBuildOptions): THREE.Group {
  const {
    rooms,
    items,
    scale = 1,
    wallHeight = WALL_H,
    highlightRoomId,
    selectedItemId,
  } = opts;
  const root = new THREE.Group();
  root.name = "home-floor";

  for (const room of rooms) {
    const roomGroup = new THREE.Group();
    roomGroup.name = `room-${room.id}`;
    roomGroup.userData.roomId = room.id;

    const { x: cx, z: cz } = roomCenter(room);
    const { w, d } = roomSize(room);
    const floorColor = FLOOR_COLORS[room.floor] ?? ROOM_TYPE_COLORS[room.type] ?? 0xf5f5f5;

    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(w - 0.02, 0.05, d - 0.02),
      mat(floorColor)
    );
    floor.position.set(cx, 0.025, cz);
    floor.receiveShadow = true;
    floor.userData.roomId = room.id;
    floor.name = `floor-${room.id}`;
    roomGroup.add(floor);

    if (highlightRoomId === room.id) {
      const hl = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.02, 0.02, d + 0.02),
        new THREE.MeshBasicMaterial({ color: 0xff9ec4, transparent: true, opacity: 0.35 })
      );
      hl.position.set(cx, 0.06, cz);
      roomGroup.add(hl);
    }

    const sides: { side: "n" | "s" | "e" | "w"; wx: number; wz: number; px: number; pz: number }[] = [
      { side: "n", wx: w, wz: WALL_THICK, px: cx, pz: cz - d / 2 + WALL_THICK / 2 },
      { side: "s", wx: w, wz: WALL_THICK, px: cx, pz: cz + d / 2 - WALL_THICK / 2 },
      { side: "w", wx: WALL_THICK, wz: d, px: cx - w / 2 + WALL_THICK / 2, pz: cz },
      { side: "e", wx: WALL_THICK, wz: d, px: cx + w / 2 - WALL_THICK / 2, pz: cz },
    ];

    for (const s of sides) {
      const exterior = isExteriorEdge(room, s.side) || room.type === "balcony";
      const neighbor = hasNeighbor(room, rooms, s.side);
      if (!neighbor || exterior) {
        const h = exterior ? wallHeight : wallHeight * 0.55;
        const wall = new THREE.Mesh(
          new THREE.BoxGeometry(s.wx, h, s.wz),
          mat(0xffffff, { transparent: true, opacity: exterior ? 0.92 : 0.75 })
        );
        wall.position.set(s.px, h / 2 + 0.05, s.pz);
        wall.castShadow = true;
        roomGroup.add(wall);

        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(wall.geometry),
          new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })
        );
        edges.position.copy(wall.position);
        roomGroup.add(edges);
      }
    }

    root.add(roomGroup);
  }

  const furnitureRoot = new THREE.Group();
  furnitureRoot.name = "home-furniture";
  for (const item of items) {
    const room = rooms.find((r) => r.id === item.roomId);
    if (!room) continue;
    const mesh = buildFurnitureMesh(item.kind);
    mesh.scale.setScalar(0.62 * scale);
    const p = itemWorldPos(item, room);
    mesh.position.set(p.x, 0.06, p.z);
    mesh.rotation.y = (item.rot * Math.PI) / 2;
    mesh.userData.placedId = item.id;
    mesh.userData.roomId = item.roomId;
    if (selectedItemId === item.id) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.2, 0.28, 16),
        new THREE.MeshBasicMaterial({ color: 0xff9ec4, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.02;
      mesh.add(ring);
    }
    furnitureRoot.add(mesh);
  }
  root.add(furnitureRoot);

  root.scale.setScalar(scale);
  return root;
}

export function fitScaleToBox(maxW: number, maxD: number) {
  const planW = PLAN_W * SCALE;
  const planD = PLAN_H * SCALE;
  return Math.min(maxW / planW, maxD / planD) * 0.92;
}

export function disposeHomeGroup(group: THREE.Object3D) {
  group.traverse((o) => {
    if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
      o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => m.dispose());
    }
  });
}
