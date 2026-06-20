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
  buildExteriorWall,
  buildInteriorWall,
  buildRoomLabel,
  buildRoundWindow,
  buildTileFloor,
  buildWoodFloor,
  bondeeMat,
  roundedBox,
  setObjectRenderLayer,
  tagHomeWall,
  WALL_INTERIOR_COLOR,
} from "./bondee-mesh-utils";
import { computeHomeDoorways, type HomeDoorway } from "./home-doorways";
import {
  classifyWallEdge,
  deriveHomeWalls,
  resolveWallBuild,
  wallHeightWorld,
  wallThicknessWorld,
  HOME_WALL_BASE_HEIGHT,
  type HomeWallSide,
} from "./home-walls";

const WALL_H = HOME_WALL_BASE_HEIGHT;
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
  hall: "엘리베이터",
  balcony: "발코니",
};

function sideWallDims(
  side: HomeWallSide,
  w: number,
  d: number,
  cx: number,
  cz: number,
  thick: number
) {
  if (side === "n" || side === "s") {
    return {
      wx: w,
      wz: thick,
      px: cx,
      pz: cz + (side === "n" ? -d / 2 + thick / 2 : d / 2 - thick / 2),
    };
  }
  return {
    wx: thick,
    wz: d,
    px: cx + (side === "w" ? -w / 2 + thick / 2 : w / 2 - thick / 2),
    pz: cz,
  };
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

  const mainLiving = rooms.find((r) => r.id === "living")?.id ?? rooms.find((r) => r.type === "living")?.id;

  for (const r of rooms) {
    if (r.id === "living") {
      add(r.id, "rug", 0, 0);
      add(r.id, "sofa", -1, 0);
      add(r.id, "tv_stand", 1, -1);
      add(r.id, "floor_lamp", -2, 1, 1);
      add(r.id, "plant", 1, 1);
      add(r.id, "gramophone", 2, 0, 1);
      add(r.id, "upright_piano", -2, -1, 0);
      add(r.id, "acoustic_guitar", 2, 1, 2);
      add(r.id, "window", -2, -1, 2);
    } else if (r.id === "hall-corridor") {
      add(r.id, "rug", 0, 0);
      add(r.id, "plant", -2, 0);
      add(r.id, "clock", 2, 0);
    } else if (r.type === "living" && r.id === mainLiving) {
      add(r.id, "rug", 0, 0);
      add(r.id, "sofa", -1, 0);
      add(r.id, "coffee_table", 0, 1);
      add(r.id, "tv_stand", 1, -1);
    } else if (r.type === "living") {
      add(r.id, "plant", 0, 0);
    } else if (r.id === "bedroom-2") {
      add(r.id, "bed", 0, 0);
      add(r.id, "tv_stand", 1, -1);
      add(r.id, "floor_lamp", -1, 1);
      add(r.id, "bookshelf", -2, -1, 2);
      add(r.id, "smartphone", 1, 1);
    } else if (r.id === "bedroom-1") {
      add(r.id, "bed", 0, 0);
      add(r.id, "rug", 1, 1);
      add(r.id, "bookshelf", -2, -1, 2);
      add(r.id, "window", 2, -1, 0);
      add(r.id, "ac", 2, 1, 2);
    } else if (r.type === "kitchen") {
      add(r.id, "refrigerator", -1, -1, 2);
      add(r.id, "shelf_small", 0, -1);
      add(r.id, "desk", 0, 0);
      add(r.id, "monitor", 0, 1);
      add(r.id, "computer", 1, 0, 1);
      add(r.id, "smartphone", -1, 1);
      add(r.id, "ac", 2, -1, 2);
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
    } else if (r.id === "elevator") {
      add(r.id, "plant", 0, 0);
      add(r.id, "rug", -1, 1);
    } else if (r.type === "hall") {
      add(r.id, "rug", 0, 0);
      add(r.id, "plant", -1, 0);
      add(r.id, "clock", 1, 0);
    }
  }
  return items;
}

export function migrateItems(items: BondeePlacedItem[], rooms: AptRoom[]): BondeePlacedItem[] {
  const mainLiving =
    rooms.find((r) => r.id === "living")?.id ??
    rooms
      .filter((r) => r.type === "living")
      .sort((a, b) => b.w * b.h - a.w * a.h)[0]?.id ??
    rooms[0]?.id ??
    "living";
  const migrated = items.map((it) => ({
    ...it,
    roomId: rooms.some((r) => r.id === it.roomId) ? it.roomId : mainLiving,
  }));
  if (!migrated.some((it) => it.kind === "gramophone")) {
    migrated.push({
      id: `${mainLiving}-gramophone-migrated`,
      kind: "gramophone",
      roomId: mainLiving,
      gx: 2,
      gz: 0,
      rot: 2,
    });
  }
  return migrated;
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

/**
 * 문이 뚫린 내벽 한 장 전체를 만든다.
 * 문짝(여닫이) + 상인방 + 좌우 벽을 공유 변(`dims`) 전체에 채워,
 * 문 구멍을 제외한 면은 빈틈 없이 막힌다(통과 벽·공중에 뜬 문틀 방지).
 */
function buildInteriorDoor(
  door: HomeDoorway,
  wallHeight: number,
  _accent: number,
  dims: { wx: number; wz: number; px: number; pz: number }
): THREE.Group {
  const g = new THREE.Group();
  g.name = `door-${door.id}`;
  g.userData.doorId = door.id;

  const doorH = wallHeight * 0.86;
  const doorW = Math.min(door.span * 0.9, 0.56);
  const frameT = 0.042;

  const frameMat = bondeeMat(BONDEE_PALETTE.trim, { transparent: true, opacity: 0.85 });
  const makeInteriorSeg = (geo: THREE.BufferGeometry, x: number, y: number, z: number) => {
    const seg = new THREE.Mesh(geo, bondeeMat(WALL_INTERIOR_COLOR, { transparent: true, opacity: 0.3, depthWrite: false }));
    seg.position.set(x, y, z);
    tagHomeWall(seg, "interior");
    return seg;
  };

  const pivot = new THREE.Group();
  const hingeX = door.axis === "z" ? door.cx - doorW / 2 : door.cx;
  const hingeZ = door.axis === "x" ? door.cz - doorW / 2 : door.cz;
  pivot.position.set(hingeX, 0, hingeZ);

  const leaf = new THREE.Mesh(roundedBox(doorW, doorH, frameT, 0.008), bondeeMat(0xc9a882));
  leaf.position.set(door.axis === "z" ? doorW / 2 : 0, doorH / 2 + 0.05, door.axis === "x" ? doorW / 2 : 0);
  pivot.rotation.y = 0;
  pivot.userData.baseRotY = 0;
  pivot.userData.openSign = door.swing;
  leaf.userData.isHomeDoorLeaf = true;
  leaf.userData.doorId = door.id;
  pivot.add(leaf);
  g.add(pivot);

  const transomH = Math.max(0.06, wallHeight - doorH);
  const lintel = new THREE.Mesh(roundedBox(doorW + 0.08, transomH, frameT + 0.012, 0.006), frameMat);
  lintel.position.set(door.cx, doorH + transomH / 2 + 0.04, door.cz);
  g.add(lintel);

  const jambDepth = frameT + 0.02;
  if (door.axis === "x") {
    for (const sign of [-1, 1] as const) {
      const jamb = new THREE.Mesh(roundedBox(frameT, doorH, jambDepth, 0.006), frameMat);
      jamb.position.set(door.cx, doorH / 2 + 0.05, door.cz + sign * (doorW / 2 + frameT / 2));
      g.add(jamb);
    }
    // e/w 벽: z축을 따라 면 전체를 채운다
    const minZ = dims.pz - dims.wz / 2;
    const maxZ = dims.pz + dims.wz / 2;
    const negLen = door.cz - doorW / 2 - frameT - minZ;
    if (negLen > 0.02) {
      g.add(makeInteriorSeg(roundedBox(frameT, wallHeight, negLen, 0.006), door.cx, wallHeight / 2 + 0.05, minZ + negLen / 2));
    }
    const posLen = maxZ - (door.cz + doorW / 2 + frameT);
    if (posLen > 0.02) {
      g.add(makeInteriorSeg(roundedBox(frameT, wallHeight, posLen, 0.006), door.cx, wallHeight / 2 + 0.05, maxZ - posLen / 2));
    }
  } else {
    for (const sign of [-1, 1] as const) {
      const jamb = new THREE.Mesh(roundedBox(jambDepth, doorH, frameT, 0.006), frameMat);
      jamb.position.set(door.cx + sign * (doorW / 2 + frameT / 2), doorH / 2 + 0.05, door.cz);
      g.add(jamb);
    }
    // n/s 벽: x축을 따라 면 전체를 채운다
    const minX = dims.px - dims.wx / 2;
    const maxX = dims.px + dims.wx / 2;
    const negLen = door.cx - doorW / 2 - frameT - minX;
    if (negLen > 0.02) {
      g.add(makeInteriorSeg(roundedBox(negLen, wallHeight, frameT, 0.006), minX + negLen / 2, wallHeight / 2 + 0.05, door.cz));
    }
    const posLen = maxX - (door.cx + doorW / 2 + frameT);
    if (posLen > 0.02) {
      g.add(
        makeInteriorSeg(
          roundedBox(posLen, wallHeight, frameT, 0.006),
          maxX - posLen / 2,
          wallHeight / 2 + 0.05,
          door.cz
        )
      );
    }
  }

  setObjectRenderLayer(g, 3);
  return g;
}

export { deriveHomeWalls, HOME_WALL_BASE_HEIGHT, type HomeWall, type HomeWallType } from "./home-walls";

/** Room shells only — floors, walls, labels (no furniture) */
export function buildHomeShellGroup(opts: Omit<HomeFloorBuildOptions, "items" | "furnitureMode">): THREE.Group {
  const { rooms, scale = 1, wallHeight = WALL_H, highlightRoomId, visibleRoomIds, wallStyle = "default" } = opts;
  const dollhouse = wallStyle === "dollhouse-open";
  const root = new THREE.Group();
  root.name = "home-shell";
  const doorways = computeHomeDoorways(rooms);
  const wallCatalog = deriveHomeWalls(rooms, wallHeight);
  const wallByKey = new Map(wallCatalog.map((w) => [`${w.roomId}:${w.side}`, w]));
  const doorRoot = new THREE.Group();
  doorRoot.name = "home-doors";
  doorRoot.renderOrder = 3;

  const exteriorWallRoot = new THREE.Group();
  exteriorWallRoot.name = "home-exterior-walls";
  exteriorWallRoot.renderOrder = 1;

  const interiorWallRoot = new THREE.Group();
  interiorWallRoot.name = "home-interior-walls";
  interiorWallRoot.renderOrder = 2;

  const floorRoot = new THREE.Group();
  floorRoot.name = "home-floors";
  floorRoot.renderOrder = 0;

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

    const label = buildRoomLabel(room.label ?? ROOM_LABELS[room.type] ?? room.type, accent);
    label.position.set(cx - w / 2 + 0.28, 0, cz - d / 2 + 0.18);
    if (!dollhouse) roomGroup.add(label);

    for (const side of ["n", "s", "e", "w"] as const) {
      if (dollhouse && side === "s") continue;

      const resolved = resolveWallBuild(room, side, rooms, doorways);
      const wallType = classifyWallEdge(room, rooms, side);
      const thick = wallThicknessWorld(wallType);
      const dims = sideWallDims(side, w, d, cx, cz, thick);
      const wallMeta = wallByKey.get(`${room.id}:${side}`);
      const wallId = wallMeta?.id;

      if (resolved.kind === "door") {
        if (resolved.doorway) {
          const doorWallH = wallHeightWorld(wallHeight, "INTERIOR");
          doorRoot.add(buildInteriorDoor(resolved.doorway, doorWallH, accent, dims));
        }
        continue;
      }
      if (resolved.kind === "skip") continue;

      const h = wallHeightWorld(wallHeight, wallType);
      const isExterior = wallType === "EXTERIOR";

      if (dollhouse) {
        const wallMesh = new THREE.Mesh(
          new THREE.BoxGeometry(dims.wx, h, dims.wz),
          bondeeMat(BONDEE_PALETTE.wallWhite)
        );
        wallMesh.position.set(dims.px, h / 2 + 0.05, dims.pz);
        roomGroup.add(wallMesh);
        continue;
      }

      const wallGroup = isExterior
        ? buildExteriorWall(dims.wx, h, dims.wz, wallId, side)
        : buildInteriorWall(dims.wx, h, dims.wz, wallId, side);
      wallGroup.position.set(dims.px, 0, dims.pz);
      (isExterior ? exteriorWallRoot : interiorWallRoot).add(wallGroup);

      if (isExterior && room.type !== "balcony") {
        const win = buildRoundWindow(0.1);
        win.position.set(dims.px, h * 0.52, dims.pz + (side === "n" ? 0.04 : side === "s" ? -0.04 : 0));
        if (side === "w" || side === "e") win.rotation.y = Math.PI / 2;
        exteriorWallRoot.add(win);
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

    floorRoot.add(roomGroup);
  }

  root.add(floorRoot);
  root.add(exteriorWallRoot);
  root.add(interiorWallRoot);
  root.add(doorRoot);
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
      o.renderOrder = 10;
    }
  });
  mesh.renderOrder = 10;

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
