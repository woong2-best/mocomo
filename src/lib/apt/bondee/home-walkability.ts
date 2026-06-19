import { PLAN_H, PLAN_W, type AptRoom } from "@/lib/apt/floor-plan-types";
import { roomCenter, roomSize } from "@/lib/apt/building-from-plan";

type Side = "n" | "s" | "e" | "w";

const EXTERIOR_INSET = 0.1;
const INTERIOR_INSET = 0.02;

function planRect(room: AptRoom) {
  return { x1: room.x, y1: room.y, x2: room.x + room.w, y2: room.y + room.h };
}

function sharesEdge(a: AptRoom, b: AptRoom, side: Side, tol = 2): boolean {
  const ra = planRect(a);
  const rb = planRect(b);
  if (side === "e") return Math.abs(ra.x2 - rb.x1) <= tol && ra.y1 < rb.y2 - tol && ra.y2 > rb.y1 + tol;
  if (side === "w") return Math.abs(ra.x1 - rb.x2) <= tol && ra.y1 < rb.y2 - tol && ra.y2 > rb.y1 + tol;
  if (side === "s") return Math.abs(ra.y2 - rb.y1) <= tol && ra.x1 < rb.x2 - tol && ra.x2 > rb.x1 + tol;
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

function insetForSide(room: AptRoom, rooms: AptRoom[], side: Side) {
  if (isExteriorEdge(room, side) || room.type === "balcony") return EXTERIOR_INSET;
  if (hasNeighbor(room, rooms, side)) return INTERIOR_INSET;
  return EXTERIOR_INSET;
}

function roomBounds(room: AptRoom, rooms: AptRoom[]) {
  const c = roomCenter(room);
  const { w, d } = roomSize(room);
  return {
    minX: c.x - w / 2 + insetForSide(room, rooms, "w"),
    maxX: c.x + w / 2 - insetForSide(room, rooms, "e"),
    minZ: c.z - d / 2 + insetForSide(room, rooms, "n"),
    maxZ: c.z + d / 2 - insetForSide(room, rooms, "s"),
  };
}

/** Walkable anywhere inside a room; interior walls use a thin inset so doorways stay open. */
export function isWalkable(x: number, z: number, rooms: AptRoom[]): boolean {
  for (const room of rooms) {
    const b = roomBounds(room, rooms);
    if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) return true;
  }
  return false;
}

/** Room the avatar is standing in (largest overlap when on a shared edge). */
export function findRoomAt(x: number, z: number, rooms: AptRoom[]): AptRoom | null {
  let best: AptRoom | null = null;
  let bestArea = 0;

  for (const room of rooms) {
    const b = roomBounds(room, rooms);
    if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) continue;
    const area = roomSize(room).w * roomSize(room).d;
    if (area >= bestArea) {
      bestArea = area;
      best = room;
    }
  }
  return best;
}
