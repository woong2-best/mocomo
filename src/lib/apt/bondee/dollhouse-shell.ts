"use client";

import * as THREE from "three";
import { SCALE, roomCenter, roomSize } from "@/lib/apt/building-from-plan";
import { PLAN_H, PLAN_W, type AptRoom } from "@/lib/apt/floor-plan-types";
import { bondeeMat, roundedBox } from "./bondee-mesh-utils";
import { getRoomTheme } from "./bondee-textures";
import {
  classifyWallEdge,
  resolveWallBuild,
  wallHeightWorld,
  wallThicknessWorld,
  HOME_WALL_BASE_HEIGHT,
  type HomeWallSide,
} from "./home-walls";
import { computeHomeDoorways, type HomeDoorway } from "./home-doorways";

/** Reference-matched dollhouse palette */
export const DH = {
  bg: 0xf2ebe3,
  wall: 0xf5f0ea,
  wallInner: 0xeee8e0,
  cap: 0x3a3a40,
  capSide: 0x2e2e33,
  floorBeige: 0xe8ddd0,
  floorWood: 0xdfc9a8,
  floorWoodGrain: 0xd4bc98,
  floorTile: 0xb8ccd8,
  floorTileLine: 0x9eb4c4,
  doorWood: 0xc9a070,
  doorWoodDark: 0xb08850,
  doorFrame: 0xe8ddd0,
  knob: 0xc8a040,
  baseboard: 0xd8cec0,
  shadow: 0x2a2018,
  highlight: 0xffe8c8,
  platform: 0xe0d5c8,
} as const;

const WALL_H = HOME_WALL_BASE_HEIGHT;
const texCache = new Map<string, THREE.CanvasTexture>();

function hex(c: number) {
  return `#${c.toString(16).padStart(6, "0")}`;
}

function canvasTex(
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
  repeat = { x: 2, y: 2 }
): THREE.CanvasTexture {
  const hit = texCache.get(key);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  draw(ctx);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat.x, repeat.y);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  texCache.set(key, tex);
  return tex;
}

function plasterMat() {
  const map = canvasTex("dh-plaster", 128, 128, (ctx) => {
    ctx.fillStyle = hex(DH.wall);
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 800; i++) {
      const x = Math.random() * 128;
      const y = Math.random() * 128;
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.025})`;
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    for (let y = 0; y < 128; y += 12) ctx.fillRect(0, y, 128, 1);
  });
  return new THREE.MeshStandardMaterial({
    map,
    color: 0xffffff,
    roughness: 0.88,
    metalness: 0,
  });
}

function beigeFloorMat(repeatX: number, repeatY: number) {
  const map = canvasTex(
    "dh-beige-floor",
    128,
    128,
    (ctx) => {
      ctx.fillStyle = hex(DH.floorBeige);
      ctx.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 600; i++) {
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.018})`;
        ctx.fillRect(Math.random() * 128, Math.random() * 128, 1.5, 1.5);
      }
    },
    { x: repeatX, y: repeatY }
  );
  return new THREE.MeshStandardMaterial({ map, color: 0xffffff, roughness: 0.82, metalness: 0 });
}

function woodFloorMat(repeatX: number, repeatY: number) {
  const map = canvasTex(
    "dh-wood-floor",
    128,
    128,
    (ctx) => {
      ctx.fillStyle = hex(DH.floorWood);
      ctx.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 16; i++) {
        const y = i * 8;
        ctx.fillStyle = i % 2 === 0 ? hex(DH.floorWoodGrain) : hex(DH.floorWood);
        ctx.globalAlpha = 0.35;
        ctx.fillRect(0, y, 128, 6);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "rgba(0,0,0,0.04)";
        ctx.beginPath();
        ctx.moveTo(0, y + 6);
        ctx.lineTo(128, y + 6);
        ctx.stroke();
      }
    },
    { x: repeatX, y: repeatY }
  );
  return new THREE.MeshStandardMaterial({ map, color: 0xffffff, roughness: 0.68, metalness: 0 });
}

function tileFloorMat(repeatX: number, repeatY: number) {
  const map = canvasTex(
    "dh-bath-tile",
    64,
    64,
    (ctx) => {
      ctx.fillStyle = hex(DH.floorTile);
      ctx.fillRect(0, 0, 64, 64);
      ctx.strokeStyle = hex(DH.floorTileLine);
      ctx.lineWidth = 1;
      for (let i = 0; i <= 64; i += 16) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 64);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(64, i);
        ctx.stroke();
      }
    },
    { x: repeatX, y: repeatY }
  );
  return new THREE.MeshStandardMaterial({ map, color: 0xffffff, roughness: 0.55, metalness: 0.02 });
}

function doorWoodMat() {
  const map = canvasTex("dh-door", 64, 128, (ctx) => {
    ctx.fillStyle = hex(DH.doorWood);
    ctx.fillRect(0, 0, 64, 128);
    for (let i = 0; i < 5; i++) {
      const x = 8 + i * 11;
      ctx.fillStyle = hex(DH.doorWoodDark);
      ctx.globalAlpha = 0.25;
      ctx.fillRect(x, 4, 2, 120);
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.lineWidth = 1;
    ctx.strokeRect(4, 4, 56, 120);
    ctx.strokeRect(4, 64, 56, 0);
  });
  return new THREE.MeshStandardMaterial({ map, color: 0xffffff, roughness: 0.72, metalness: 0 });
}

let sharedPlaster: THREE.MeshStandardMaterial | null = null;
function getPlasterMat() {
  if (!sharedPlaster) sharedPlaster = plasterMat();
  return sharedPlaster;
}

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

function buildWallSegment(
  wx: number,
  h: number,
  wz: number,
  px: number,
  pz: number,
  parent: THREE.Group,
  exterior: boolean
) {
  const g = new THREE.Group();
  const plaster = getPlasterMat();
  const wall = new THREE.Mesh(new THREE.BoxGeometry(wx, h, wz), plaster);
  wall.position.set(0, h / 2 + 0.04, 0);
  wall.castShadow = true;
  wall.receiveShadow = true;
  g.add(wall);

  const capW = wx + (wx > wz ? 0.04 : 0.02);
  const capD = wz + (wz >= wx ? 0.04 : 0.02);
  const cap = new THREE.Mesh(
    new THREE.BoxGeometry(capW, 0.062, capD),
    bondeeMat(DH.cap, { roughness: 0.82, metalness: 0.05 })
  );
  cap.position.set(0, h + 0.04 + 0.031, 0);
  g.add(cap);

  if (exterior) {
    const capSide = new THREE.Mesh(
      new THREE.BoxGeometry(capW + 0.02, 0.028, capD + 0.02),
      bondeeMat(DH.capSide, { roughness: 0.9 })
    );
    capSide.position.set(0, h + 0.04 + 0.058, 0);
    g.add(capSide);
  }

  const baseboardH = 0.055;
  const board = new THREE.Mesh(
    roundedBox(wx - 0.02, baseboardH, wz + 0.008, 0.008),
    bondeeMat(DH.baseboard, { roughness: 0.85 })
  );
  board.position.set(0, baseboardH / 2 + 0.04, 0);
  g.add(board);

  g.position.set(px, 0, pz);
  parent.add(g);
  return g;
}

function doorOpenAngle(door: HomeDoorway, rooms: AptRoom[]): number {
  const roomB = rooms.find((r) => r.id === door.roomB);
  if (roomB?.type === "bathroom") return Math.PI * 0.48;
  if (roomB?.type === "bedroom") return Math.PI * 0.42;
  if (roomB?.type === "hall" || roomB?.type === "entrance") return Math.PI * 0.35;
  return Math.PI * 0.38;
}

function buildDollhouseDoor(
  door: HomeDoorway,
  wallHeight: number,
  dims: { wx: number; wz: number; px: number; pz: number },
  rooms: AptRoom[],
  parent: THREE.Group
) {
  const g = new THREE.Group();
  g.name = `dollhouse-door-${door.id}`;

  const doorH = wallHeight * 0.88;
  const doorW = Math.min(door.span * 0.92, 0.54);
  const frameT = 0.045;
  const plaster = getPlasterMat();
  const frameMat = bondeeMat(DH.doorFrame, { roughness: 0.8 });

  const fillWall = (geo: THREE.BufferGeometry, x: number, y: number, z: number) => {
    const seg = new THREE.Mesh(geo, plaster);
    seg.position.set(x, y, z);
    seg.castShadow = true;
    g.add(seg);
  };

  const pivot = new THREE.Group();
  const hingeX = door.axis === "z" ? door.cx - doorW / 2 : door.cx;
  const hingeZ = door.axis === "x" ? door.cz - doorW / 2 : door.cz;
  pivot.position.set(hingeX, 0, hingeZ);

  const leaf = new THREE.Mesh(roundedBox(doorW, doorH, frameT + 0.012, 0.01), doorWoodMat());
  leaf.position.set(
    door.axis === "z" ? doorW / 2 : 0,
    doorH / 2 + 0.04,
    door.axis === "x" ? doorW / 2 : 0
  );
  leaf.castShadow = true;

  const knob = new THREE.Mesh(
    new THREE.SphereGeometry(0.028, 10, 10),
    bondeeMat(DH.knob, { roughness: 0.35, metalness: 0.45 })
  );
  knob.position.set(
    door.axis === "z" ? doorW * 0.78 : frameT * 0.5,
    0,
    door.axis === "x" ? doorW * 0.78 : frameT * 0.5
  );
  leaf.add(knob);
  pivot.add(leaf);

  const open = doorOpenAngle(door, rooms) * door.swing;
  pivot.rotation.y = open;
  g.add(pivot);

  const transomH = Math.max(0.05, wallHeight - doorH);
  const lintel = new THREE.Mesh(roundedBox(doorW + 0.1, transomH, frameT + 0.014, 0.006), frameMat);
  lintel.position.set(door.cx, doorH + transomH / 2 + 0.04, door.cz);
  g.add(lintel);

  if (door.axis === "x") {
    for (const sign of [-1, 1] as const) {
      const jamb = new THREE.Mesh(roundedBox(frameT, doorH, frameT + 0.02, 0.006), frameMat);
      jamb.position.set(door.cx, doorH / 2 + 0.04, door.cz + sign * (doorW / 2 + frameT / 2));
      g.add(jamb);
    }
    const minZ = dims.pz - dims.wz / 2;
    const maxZ = dims.pz + dims.wz / 2;
    const negLen = door.cz - doorW / 2 - frameT - minZ;
    if (negLen > 0.02) {
      fillWall(
        new THREE.BoxGeometry(frameT, wallHeight, negLen),
        door.cx,
        wallHeight / 2 + 0.04,
        minZ + negLen / 2
      );
    }
    const posLen = maxZ - (door.cz + doorW / 2 + frameT);
    if (posLen > 0.02) {
      fillWall(
        new THREE.BoxGeometry(frameT, wallHeight, posLen),
        door.cx,
        wallHeight / 2 + 0.04,
        maxZ - posLen / 2
      );
    }
  } else {
    for (const sign of [-1, 1] as const) {
      const jamb = new THREE.Mesh(roundedBox(frameT + 0.02, doorH, frameT, 0.006), frameMat);
      jamb.position.set(door.cx + sign * (doorW / 2 + frameT / 2), doorH / 2 + 0.04, door.cz);
      g.add(jamb);
    }
    const minX = dims.px - dims.wx / 2;
    const maxX = dims.px + dims.wx / 2;
    const negLen = door.cx - doorW / 2 - frameT - minX;
    if (negLen > 0.02) {
      fillWall(
        new THREE.BoxGeometry(negLen, wallHeight, frameT),
        minX + negLen / 2,
        wallHeight / 2 + 0.04,
        door.cz
      );
    }
    const posLen = maxX - (door.cx + doorW / 2 + frameT);
    if (posLen > 0.02) {
      fillWall(
        new THREE.BoxGeometry(posLen, wallHeight, frameT),
        maxX - posLen / 2,
        wallHeight / 2 + 0.04,
        door.cz
      );
    }
  }

  parent.add(g);
}

function floorMatForRoom(room: AptRoom, w: number, d: number): THREE.MeshStandardMaterial {
  const theme = getRoomTheme(room);
  const rx = Math.max(2, Math.ceil(w * 3));
  const ry = Math.max(2, Math.ceil(d * 3));
  switch (theme.floorKind) {
    case "tile":
      return tileFloorMat(rx, ry);
    case "wood-light":
    case "wood-dark":
      return woodFloorMat(rx, ry);
    default:
      return beigeFloorMat(rx, ry);
  }
}

function buildRoomFloor(room: AptRoom, w: number, d: number, parent: THREE.Group) {
  const g = new THREE.Group();
  g.name = `floor-${room.id}`;

  const mat = floorMatForRoom(room, w, d);
  const slab = new THREE.Mesh(roundedBox(w - 0.018, 0.07, d - 0.018, 0.015), mat);
  slab.position.y = 0.035;
  slab.receiveShadow = true;
  slab.name = `floor-${room.id}`;
  slab.userData.roomId = room.id;
  g.add(slab);

  const edge = new THREE.Mesh(
    roundedBox(w - 0.04, 0.018, d - 0.04, 0.006),
    bondeeMat(DH.baseboard, { roughness: 0.88 })
  );
  edge.position.y = 0.072;
  g.add(edge);

  parent.add(g);
  return g;
}

function buildContactShadow(cx: number, cz: number, w: number, d: number, parent: THREE.Group) {
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.92, d * 0.92),
    new THREE.MeshBasicMaterial({
      color: DH.shadow,
      transparent: true,
      opacity: 0.06,
      depthWrite: false,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(cx, 0.076, cz);
  parent.add(shadow);
}

export type PremiumDollhouseOptions = {
  rooms: AptRoom[];
  scale?: number;
  highlightRoomId?: string | null;
  visibleRoomIds?: Set<string> | null;
};

export function fitDollhouseScale(maxW = 10.2, maxD = 6.8) {
  const planW = PLAN_W * SCALE;
  const planD = PLAN_H * SCALE;
  return Math.min(maxW / planW, maxD / planD) * 0.94;
}

export function buildPremiumDollhouseGroup(opts: PremiumDollhouseOptions): THREE.Group {
  const { rooms, scale = fitDollhouseScale(), highlightRoomId, visibleRoomIds } = opts;
  const root = new THREE.Group();
  root.name = "premium-dollhouse";

  const doorways = computeHomeDoorways(rooms);
  const floorRoot = new THREE.Group();
  floorRoot.name = "dollhouse-floors";
  const wallRoot = new THREE.Group();
  wallRoot.name = "dollhouse-walls";
  const doorRoot = new THREE.Group();
  doorRoot.name = "dollhouse-doors";

  const shouldShow = (id: string) => {
    if (!visibleRoomIds || visibleRoomIds.size === 0) return true;
    return visibleRoomIds.has(id);
  };

  for (const room of rooms) {
    if (!shouldShow(room.id)) continue;
    const { x: cx, z: cz } = roomCenter(room);
    const { w, d } = roomSize(room);

    const roomGroup = new THREE.Group();
    roomGroup.name = `room-${room.id}`;
    roomGroup.userData.roomId = room.id;

    const floorG = buildRoomFloor(room, w, d, roomGroup);
    floorG.position.set(cx, 0, cz);
    buildContactShadow(cx, cz, w, d, roomGroup);

    if (highlightRoomId === room.id) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(Math.min(w, d) * 0.22, Math.min(w, d) * 0.28, 32),
        new THREE.MeshBasicMaterial({
          color: DH.highlight,
          transparent: true,
          opacity: 0.55,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(cx, 0.085, cz);
      roomGroup.add(ring);
    }

    for (const side of ["n", "s", "e", "w"] as const) {
      if (side === "s") continue;

      const resolved = resolveWallBuild(room, side, rooms, doorways);
      const wallType = classifyWallEdge(room, rooms, side);
      const thick = wallThicknessWorld(wallType);
      const dims = sideWallDims(side, w, d, cx, cz, thick);
      const h = wallHeightWorld(WALL_H, wallType);
      const exterior = wallType === "EXTERIOR";

      if (resolved.kind === "door") {
        if (resolved.doorway) {
          buildDollhouseDoor(resolved.doorway, h, dims, rooms, doorRoot);
        }
        continue;
      }
      if (resolved.kind === "skip") continue;

      buildWallSegment(dims.wx, h, dims.wz, dims.px, dims.pz, wallRoot, exterior);
    }

    floorRoot.add(roomGroup);
  }

  const platform = new THREE.Mesh(
    roundedBox(PLAN_W * SCALE + 0.35, 0.06, PLAN_H * SCALE + 0.35, 0.02),
    bondeeMat(DH.platform, { roughness: 0.92 })
  );
  platform.position.y = -0.01;
  platform.receiveShadow = true;
  root.add(platform);

  root.add(floorRoot);
  root.add(wallRoot);
  root.add(doorRoot);
  root.scale.setScalar(scale);
  return root;
}

export function disposePremiumDollhouse(group: THREE.Object3D) {
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        if ("map" in m && m.map instanceof THREE.Texture) m.map.dispose();
        m.dispose();
      });
    }
  });
}

export function disposeDollhouseTextures() {
  texCache.forEach((t) => t.dispose());
  texCache.clear();
  sharedPlaster = null;
}
