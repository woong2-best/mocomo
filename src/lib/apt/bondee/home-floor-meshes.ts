"use client";

import * as THREE from "three";
import { SCALE, roomCenter, roomSize } from "@/lib/apt/building-from-plan";
import { PLAN_H, PLAN_W, type AptRoom, type FloorStyle } from "@/lib/apt/floor-plan-types";
import { buildFurnitureMesh } from "./furniture-meshes";
import { architecturesForKind } from "./furniture-architecture";
import { buildInstancedFurnitureGroup } from "./furniture-instances";
import { studioPlaceholderMesh } from "./studio-gltf-meshes";
import type { BondeePlacedItem } from "./types";
import {
  BONDEE_PALETTE,
  buildCarpetFloor,
  buildLowWall,
  buildRoomLabel,
  buildRoundWindow,
  buildTileFloor,
  buildWoodFloor,
  bondeeMat,
} from "./bondee-mesh-utils";

const WALL_H = 0.2;
const WALL_THICK = 0.035;
const ITEM_GRID = 0.38;

const ROOM_ACCENT: Record<string, number> = {
  living: BONDEE_PALETTE.wallPink,
  bedroom: BONDEE_PALETTE.wallLavender,
  kitchen: BONDEE_PALETTE.wallPeach,
  bathroom: BONDEE_PALETTE.bathroom,
  entrance: BONDEE_PALETTE.wallMint,
  hall: 0xf0f0f0,
  balcony: BONDEE_PALETTE.balcony,
};

const ROOM_LABELS: Record<string, string> = {
  living: "거실",
  bedroom: "침실",
  kitchen: "주방",
  bathroom: "욕실",
  entrance: "현관",
  hall: "복도",
  balcony: "발코니",
};

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

function buildFloorForRoom(room: AptRoom, w: number, d: number): THREE.Group {
  if (room.type === "bathroom" || room.floor === "tile-check" || room.floor === "tile-light") {
    return buildTileFloor(w, d);
  }
  if (room.type === "bedroom" || room.type === "living") {
    return buildWoodFloor(w, d);
  }
  if (room.type === "balcony") {
    return buildTileFloor(w, d);
  }
  if (room.floor === "beige") {
    return buildCarpetFloor(w, d, BONDEE_PALETTE.wallPeach);
  }
  return buildWoodFloor(w, d, BONDEE_PALETTE.wood);
}

/** Rich default layout — lived-in Bondee home */
export function defaultItemsForRooms(rooms: AptRoom[]): BondeePlacedItem[] {
  const items: BondeePlacedItem[] = [];
  let n = 0;
  const add = (roomId: string, kind: BondeePlacedItem["kind"], gx: number, gz: number, rot: 0 | 1 | 2 | 3 = 0) => {
    items.push({ id: `${roomId}-${kind}-${n++}`, kind, roomId, gx, gz, rot });
  };

  for (const r of rooms) {
    if (r.type === "living") {
      add(r.id, "rug", 0, 0);
      add(r.id, "sofa", -1, 0);
      add(r.id, "coffee_table", 0, 1);
      add(r.id, "tv_stand", 1, -1);
      add(r.id, "floor_lamp", -2, 1, 1);
      add(r.id, "plant", 2, 1);
      add(r.id, "bookshelf", -2, -1, 2);
    } else if (r.type === "kitchen") {
      add(r.id, "shelf_small", 0, -1);
      add(r.id, "desk", 0, 0);
      add(r.id, "clock", 1, -1);
      add(r.id, "plant", -1, 1);
    } else if (r.type === "bedroom") {
      add(r.id, "bed", 0, 0);
      add(r.id, "floor_lamp", -1, 1);
      add(r.id, "rug", 1, 1);
      add(r.id, "bookshelf", -2, -1, 2);
      add(r.id, "plant", 2, -1);
    } else if (r.type === "bathroom") {
      add(r.id, "washer", 0, 0);
      add(r.id, "plant", -1, 1);
      add(r.id, "shelf_small", 1, -1);
    } else if (r.type === "entrance") {
      add(r.id, "plant", 0, 0);
      add(r.id, "rug", 0, 1);
      add(r.id, "floor_lamp", -1, -1, 1);
    } else if (r.type === "hall") {
      add(r.id, "rug", 0, 0);
      add(r.id, "plant", -1, 0);
      add(r.id, "clock", 1, 0);
    } else if (r.type === "balcony") {
      add(r.id, "plant", 0, 0);
      add(r.id, "plant", -1, 1);
      add(r.id, "hoop", 1, -1);
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
  /** full = mesh clone, instanced = InstancedMesh proxies, none = skip furniture */
  furnitureMode?: "full" | "instanced" | "none";
  /** Only build shells for these rooms (frustum / proximity cull) */
  visibleRoomIds?: Set<string> | null;
  /** default = transparent Bondee walls, dollhouse-open = opaque + front cutaway */
  wallStyle?: "default" | "dollhouse-open";
};

const ROOM_PRIORITY: Record<string, number> = {
  living: 0,
  entrance: 1,
  bedroom: 2,
  kitchen: 3,
  bathroom: 4,
  hall: 5,
  balcony: 6,
};

/** Sort: active room → living → rest */
export function sortFurnitureLoadOrder(
  items: BondeePlacedItem[],
  rooms: AptRoom[],
  activeRoomId?: string | null
): BondeePlacedItem[] {
  const roomType = new Map(rooms.map((r) => [r.id, r.type]));
  return [...items].sort((a, b) => {
    if (activeRoomId) {
      if (a.roomId === activeRoomId && b.roomId !== activeRoomId) return -1;
      if (b.roomId === activeRoomId && a.roomId !== activeRoomId) return 1;
    }
    const pa = ROOM_PRIORITY[roomType.get(a.roomId) ?? ""] ?? 9;
    const pb = ROOM_PRIORITY[roomType.get(b.roomId) ?? ""] ?? 9;
    return pa - pb;
  });
}

function shouldShowRoom(roomId: string, visibleRoomIds?: Set<string> | null) {
  if (!visibleRoomIds || visibleRoomIds.size === 0) return true;
  return visibleRoomIds.has(roomId);
}

/** Room shells only — floors, walls, labels (no furniture) */
export function buildHomeShellGroup(opts: Omit<HomeFloorBuildOptions, "items" | "furnitureMode">): THREE.Group {
  const { rooms, scale = 1, wallHeight = WALL_H, highlightRoomId, visibleRoomIds, wallStyle = "default" } = opts;
  const dollhouse = wallStyle === "dollhouse-open";
  const root = new THREE.Group();
  root.name = "home-shell";

  for (const room of rooms) {
    if (!shouldShowRoom(room.id, visibleRoomIds)) continue;

    const roomGroup = new THREE.Group();
    roomGroup.name = `room-${room.id}`;
    roomGroup.userData.roomId = room.id;

    const { x: cx, z: cz } = roomCenter(room);
    const { w, d } = roomSize(room);
    const accent = ROOM_ACCENT[room.type] ?? BONDEE_PALETTE.wallPink;

    const floorMesh = buildFloorForRoom(room, w, d);
    floorMesh.position.set(cx, 0, cz);
    floorMesh.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.userData.roomId = room.id;
        o.frustumCulled = true;
        if (o.geometry.type.includes("Box") && !o.name) {
          o.name = `floor-${room.id}`;
        }
      }
    });
    const pickFloor = floorMesh.children[0] as THREE.Mesh | undefined;
    if (pickFloor) {
      pickFloor.name = `floor-${room.id}`;
      pickFloor.userData.roomId = room.id;
    }
    roomGroup.add(floorMesh);

    if (highlightRoomId === room.id) {
      const hl = new THREE.Mesh(
        new THREE.RingGeometry(Math.min(w, d) * 0.28, Math.min(w, d) * 0.34, 16),
        new THREE.MeshBasicMaterial({ color: BONDEE_PALETTE.accent, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
      );
      hl.rotation.x = -Math.PI / 2;
      hl.position.set(cx, 0.08, cz);
      roomGroup.add(hl);
    }

    const label = buildRoomLabel(ROOM_LABELS[room.type] ?? room.label ?? room.type, accent);
    label.position.set(cx - w / 2 + 0.28, 0, cz - d / 2 + 0.18);
    if (!dollhouse) roomGroup.add(label);

    const sides: { side: "n" | "s" | "e" | "w"; wx: number; wz: number; px: number; pz: number }[] = [
      { side: "n", wx: w, wz: WALL_THICK, px: cx, pz: cz - d / 2 + WALL_THICK / 2 },
      { side: "s", wx: w, wz: WALL_THICK, px: cx, pz: cz + d / 2 - WALL_THICK / 2 },
      { side: "w", wx: WALL_THICK, wz: d, px: cx - w / 2 + WALL_THICK / 2, pz: cz },
      { side: "e", wx: WALL_THICK, wz: d, px: cx + w / 2 - WALL_THICK / 2, pz: cz },
    ];

    for (const s of sides) {
      if (dollhouse && s.side === "s") continue;

      const exterior = isExteriorEdge(room, s.side) || room.type === "balcony";
      const neighbor = hasNeighbor(room, rooms, s.side);
      if (!neighbor || exterior) {
        const h = exterior ? wallHeight * 1.1 : wallHeight * 0.65;
        if (dollhouse) {
          const wallMesh = new THREE.Mesh(
            new THREE.BoxGeometry(s.wx, h, s.wz),
            bondeeMat(BONDEE_PALETTE.wallWhite)
          );
          wallMesh.position.set(s.px, h / 2 + 0.05, s.pz);
          roomGroup.add(wallMesh);
        } else {
          const wallGroup = buildLowWall(s.wx, h, s.wz, exterior);
          wallGroup.position.set(s.px, 0, s.pz);
          roomGroup.add(wallGroup);

          if (exterior && room.type !== "balcony") {
            const win = buildRoundWindow(0.07);
            win.position.set(s.px, 0, s.pz + (s.side === "n" ? 0.04 : s.side === "s" ? -0.04 : 0));
            if (s.side === "w" || s.side === "e") {
              win.rotation.y = Math.PI / 2;
            }
            roomGroup.add(win);
          }
        }
      } else if (dollhouse) {
        const divider = new THREE.Mesh(
          new THREE.BoxGeometry(s.wx, wallHeight * 0.65, s.wz),
          bondeeMat(BONDEE_PALETTE.wallWhite)
        );
        divider.position.set(s.px, wallHeight * 0.35 + 0.05, s.pz);
        roomGroup.add(divider);
      } else {
        const divider = new THREE.Mesh(
          new THREE.BoxGeometry(s.wx, wallHeight * 0.35, s.wz),
          bondeeMat(accent, { transparent: true, opacity: 0.18 })
        );
        divider.position.set(s.px, wallHeight * 0.2 + 0.05, s.pz);
        roomGroup.add(divider);
      }
    }

    if (dollhouse) {
      const ceil = new THREE.Mesh(
        new THREE.BoxGeometry(w - 0.02, 0.04, d - 0.02),
        bondeeMat(0xffffff)
      );
      ceil.position.set(cx, wallHeight * 1.05 + 0.05, cz);
      roomGroup.add(ceil);
    }

    if (room.type === "balcony") {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(w - 0.04, 0.06, 0.03),
        bondeeMat(BONDEE_PALETTE.trim, { transparent: true, opacity: 0.7 })
      );
      rail.position.set(cx, 0.12, cz + d / 2 - 0.04);
      roomGroup.add(rail);
    }

    root.add(roomGroup);
  }

  root.scale.setScalar(scale);
  return root;
}

/** Append a single furniture piece (for staged loading) */
export function appendFurniturePiece(
  furnitureRoot: THREE.Group,
  item: BondeePlacedItem,
  rooms: AptRoom[],
  opts: { scale?: number; selectedItemId?: string | null }
) {
  const room = rooms.find((r) => r.id === item.roomId);
  if (!room) return;

  const scale = opts.scale ?? 1;

  let mesh: THREE.Group | THREE.Mesh;
  if (item.studioAssetId && item.glbUrl) {
    const group = new THREE.Group();
    group.add(studioPlaceholderMesh());
    group.userData.studioGlbUrl = item.glbUrl;
    mesh = group;
  } else {
    mesh = buildFurnitureMesh(item.kind);
  }

  const p = itemWorldPos(item, room);
  mesh.position.set(p.x, 0.06, p.z);
  mesh.scale.setScalar(item.studioAssetId ? scale : 0.68 * scale);
  mesh.rotation.y = (item.rot * Math.PI) / 2;
  mesh.userData.placedId = item.id;
  mesh.userData.roomId = item.roomId;
  mesh.userData.architectures = architecturesForKind(item.kind);
  mesh.frustumCulled = true;

  if (opts.selectedItemId === item.id) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.22, 0.32, 16),
      new THREE.MeshBasicMaterial({ color: BONDEE_PALETTE.accent, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
    );
    ring.name = "selection-ring";
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    mesh.add(ring);
  }

  mesh.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = false;
      o.receiveShadow = false;
    }
  });

  furnitureRoot.add(mesh);
}

export function buildHomeFloorGroup(opts: HomeFloorBuildOptions): THREE.Group {
  const {
    rooms,
    items,
    scale = 1,
    wallHeight = WALL_H,
    highlightRoomId,
    selectedItemId,
    furnitureMode = "full",
    visibleRoomIds,
    wallStyle = "default",
  } = opts;

  const root = new THREE.Group();
  root.name = "home-floor";

  const shell = buildHomeShellGroup({ rooms, scale: 1, wallHeight, highlightRoomId, visibleRoomIds, wallStyle });
  root.add(shell);

  if (furnitureMode === "none") {
    root.scale.setScalar(scale);
    return root;
  }

  const visibleItems = items.filter((it) => shouldShowRoom(it.roomId, visibleRoomIds));
  const furnitureRoot = new THREE.Group();
  furnitureRoot.name = "home-furniture";

  if (furnitureMode === "instanced") {
    furnitureRoot.add(buildInstancedFurnitureGroup(visibleItems, rooms, 0.68 * scale));
  } else {
    for (const item of visibleItems) {
      appendFurniturePiece(furnitureRoot, item, rooms, { scale, selectedItemId });
    }
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
    if (o instanceof THREE.InstancedMesh) {
      o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => m.dispose());
      return;
    }
    if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
      o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        if ("map" in m && m.map instanceof THREE.Texture) m.map.dispose();
        m.dispose();
      });
    }
  });
}
