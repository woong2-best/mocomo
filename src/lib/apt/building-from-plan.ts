import * as THREE from "three";
import { PLAN_H, PLAN_W, type AptRoom, type FloorStyle } from "./floor-plan-types";
import { FLOOR_HEIGHT } from "@/lib/apt/constants";

export const SCALE = 0.01;
export { FLOOR_HEIGHT };
export const WALL_THICK = 0.07;
export const WALL_H = 2.35;

const FLOOR_COLORS: Record<FloorStyle, number> = {
  wood: 0xf5f0ea,
  "tile-check": 0xf8f8f8,
  "tile-light": 0xf4f4f4,
  bathroom: 0xedf2f7,
  beige: 0xf6f4f0,
  balcony: 0xeeeeee,
};

type Side = "n" | "s" | "e" | "w";

function planRect(room: AptRoom) {
  return { x1: room.x, y1: room.y, x2: room.x + room.w, y2: room.y + room.h };
}

function sharesEdge(a: AptRoom, b: AptRoom, side: Side, tol = 2): boolean {
  const ra = planRect(a);
  const rb = planRect(b);
  if (side === "e") {
    return Math.abs(ra.x2 - rb.x1) <= tol && ra.y1 < rb.y2 - tol && ra.y2 > rb.y1 + tol;
  }
  if (side === "w") {
    return Math.abs(ra.x1 - rb.x2) <= tol && ra.y1 < rb.y2 - tol && ra.y2 > rb.y1 + tol;
  }
  if (side === "s") {
    return Math.abs(ra.y2 - rb.y1) <= tol && ra.x1 < rb.x2 - tol && ra.x2 > rb.x1 + tol;
  }
  return Math.abs(ra.y1 - rb.y2) <= tol && ra.x1 < rb.x2 - tol && ra.x2 > rb.x1 + tol;
}

function hasNeighbor(room: AptRoom, rooms: AptRoom[], side: Side) {
  return rooms.some((o) => o.id !== room.id && sharesEdge(room, o, side));
}

function isExteriorEdge(room: AptRoom, side: Side) {
  const r = planRect(room);
  if (side === "w" && r.x1 <= 1) return true;
  if (side === "n" && r.y1 <= 1) return true;
  if (side === "s" && r.y2 >= PLAN_H - 1) return true;
  if (side === "e" && r.x2 >= PLAN_W - 1) return true;
  return false;
}

export function roomCenter(room: AptRoom) {
  return {
    x: (room.x + room.w / 2) * SCALE - (PLAN_W * SCALE) / 2,
    z: (room.y + room.h / 2) * SCALE - (PLAN_H * SCALE) / 2,
  };
}

export function roomSize(room: AptRoom) {
  return { w: room.w * SCALE, d: room.h * SCALE };
}

function makeWall(
  w: number,
  h: number,
  d: number,
  exterior: boolean
): { mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial; edges?: THREE.LineSegments } {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.2,
    metalness: 0,
    transparent: true,
    opacity: exterior ? 0.88 : 0.72,
  });
  mat.userData.exterior = exterior;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  let edges: THREE.LineSegments | undefined;
  if (exterior) {
    edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(mesh.geometry),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 })
    );
    edges.position.copy(mesh.position);
  }
  return { mesh, mat, edges };
}

function addProps(group: THREE.Group, room: AptRoom) {
  const { x: cx, z: cz } = roomCenter(room);
  const { w, d } = roomSize(room);

  if (room.type === "kitchen") {
    const counter = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.72, 0.42, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x8b6f4e, roughness: 0.55 })
    );
    counter.position.set(cx, 0.35, cz - d * 0.28);
    group.add(counter);
    const sink = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.06, 0.35),
      new THREE.MeshStandardMaterial({ color: 0xb8c8d8, metalness: 0.4, roughness: 0.3 })
    );
    sink.position.set(cx + w * 0.18, 0.58, cz - d * 0.28);
    group.add(sink);
  }

  if (room.type === "bathroom") {
    const tub = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.55, 0.28, d * 0.38),
      new THREE.MeshStandardMaterial({ color: 0xf5f8fc, roughness: 0.25 })
    );
    tub.position.set(cx, 0.24, cz + d * 0.22);
    group.add(tub);
    const toilet = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.35, 0.38),
      new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.4 })
    );
    toilet.position.set(cx - w * 0.2, 0.28, cz - d * 0.15);
    group.add(toilet);
  }

  if (room.type === "entrance") {
    const cabinet = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.9, 0.32),
      new THREE.MeshStandardMaterial({ color: 0xd9cfc0, roughness: 0.6 })
    );
    cabinet.position.set(cx - w * 0.25, 0.55, cz);
    group.add(cabinet);
  }

  if (room.type === "bedroom" || room.type === "living") {
    const bed = new THREE.Mesh(
      new THREE.BoxGeometry(Math.min(w * 0.55, 2.2), 0.32, Math.min(d * 0.45, 1.6)),
      new THREE.MeshStandardMaterial({
        color: room.type === "living" ? 0xc9956a : 0xd4c4b0,
        roughness: 0.65,
      })
    );
    bed.position.set(cx + w * 0.08, 0.26, cz + d * 0.05);
    group.add(bed);
  }
}

export function buildFloorGroup(
  rooms: AptRoom[],
  options: { selectedIds: string[]; floorIndex: number }
): { group: THREE.Group; shellMats: THREE.MeshStandardMaterial[] } {
  const group = new THREE.Group();
  group.userData.floor = options.floorIndex;
  const shellMats: THREE.MeshStandardMaterial[] = [];

  for (const room of rooms) {
    const roomGroup = new THREE.Group();
    roomGroup.userData.roomId = room.id;
    roomGroup.userData.floor = options.floorIndex;

    const { x: cx, z: cz } = roomCenter(room);
    const { w, d } = roomSize(room);

    const floorMat = new THREE.MeshStandardMaterial({
      color: FLOOR_COLORS[room.floor],
      roughness: 0.82,
      metalness: 0.04,
    });
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w - 0.04, 0.1, d - 0.04), floorMat);
    slab.position.set(cx, 0.05, cz);
    slab.receiveShadow = true;
    roomGroup.add(slab);

    const sides: { side: Side; wx: number; wz: number; px: number; pz: number }[] = [
      { side: "n", wx: w, wz: WALL_THICK, px: cx, pz: cz - d / 2 + WALL_THICK / 2 },
      { side: "s", wx: w, wz: WALL_THICK, px: cx, pz: cz + d / 2 - WALL_THICK / 2 },
      { side: "w", wx: WALL_THICK, wz: d, px: cx - w / 2 + WALL_THICK / 2, pz: cz },
      { side: "e", wx: WALL_THICK, wz: d, px: cx + w / 2 - WALL_THICK / 2, pz: cz },
    ];

    for (const s of sides) {
      const neighbor = hasNeighbor(room, rooms, s.side);
      const exterior = isExteriorEdge(room, s.side) || room.type === "balcony";
      if (neighbor && !exterior) {
        const { mesh, mat } = makeWall(s.wx, WALL_H * 0.92, s.wz, false);
        mesh.position.set(s.px, WALL_H / 2 + 0.1, s.pz);
        roomGroup.add(mesh);
        shellMats.push(mat);
      } else if (!neighbor || exterior) {
        const { mesh, mat, edges } = makeWall(s.wx, WALL_H, s.wz, true);
        mesh.position.set(s.px, WALL_H / 2 + 0.1, s.pz);
        roomGroup.add(mesh);
        if (edges) {
          edges.position.set(s.px, WALL_H / 2 + 0.1, s.pz);
          roomGroup.add(edges);
        }
        shellMats.push(mat);
      }
    }

    addProps(roomGroup, room);

    if (!hasNeighbor(room, rooms, "s") || isExteriorEdge(room, "s")) {
      const winCount = Math.max(1, Math.floor(w / 1.1));
      for (let i = 0; i < winCount; i++) {
        const win = new THREE.Mesh(
          new THREE.BoxGeometry(0.55, 0.42, 0.04),
          new THREE.MeshStandardMaterial({
            color: 0xe8f0f8,
            emissive: 0x8899aa,
            emissiveIntensity: 0.08,
            transparent: true,
            opacity: 0.65,
          })
        );
        win.position.set(
          cx - w / 2 + (w / (winCount + 1)) * (i + 1),
          WALL_H * 0.55,
          cz + d / 2 + 0.03
        );
        roomGroup.add(win);
      }
    }

    if (options.selectedIds.includes(room.id)) {
      const glow = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.06, 0.12, d + 0.06),
        new THREE.MeshBasicMaterial({ color: 0xd4d4d4, transparent: true, opacity: 0.35 })
      );
      glow.position.set(cx, 0.12, cz);
      roomGroup.add(glow);
    }

    group.add(roomGroup);
  }

  const active = new THREE.Mesh(
    new THREE.BoxGeometry(PLAN_W * SCALE + 0.2, 0.04, PLAN_H * SCALE + 0.2),
    new THREE.MeshBasicMaterial({ color: 0xe0e0e0, transparent: true, opacity: 0 })
  );
  active.position.set(0, 0.02, 0);
  active.name = "floor-highlight";
  group.add(active);

  return { group, shellMats };
}

export function disposeGroup(group: THREE.Object3D) {
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) m.dispose();
    }
  });
}
