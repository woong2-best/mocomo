import { type AptRoom } from "@/lib/apt/floor-plan-types";
import { roomCenter, roomSize } from "@/lib/apt/building-from-plan";

export type DoorSide = "n" | "s" | "e" | "w";

export type HomeDoorway = {
  id: string;
  roomA: string;
  roomB: string;
  /** Wall side from roomA */
  side: DoorSide;
  cx: number;
  cz: number;
  /** Opening width along the wall */
  span: number;
  /** Wall runs along z (e/w walls) or x (n/s walls) */
  axis: "x" | "z";
  swing: 1 | -1;
};

const DOOR_MIN = 0.44;
const DOOR_MAX = 0.58;
export const DOOR_PORTAL_DEPTH = 0.34;
const DOOR_OPEN_DIST = 0.48;

export const EXIT_ROOM_ID = "__outside__";

function planRect(room: AptRoom) {
  return { x1: room.x, y1: room.y, x2: room.x + room.w, y2: room.y + room.h };
}

function sharesEdge(a: AptRoom, b: AptRoom, side: DoorSide, tol = 2): boolean {
  const ra = planRect(a);
  const rb = planRect(b);
  if (side === "e") return Math.abs(ra.x2 - rb.x1) <= tol && ra.y1 < rb.y2 - tol && ra.y2 > rb.y1 + tol;
  if (side === "w") return Math.abs(ra.x1 - rb.x2) <= tol && ra.y1 < rb.y2 - tol && ra.y2 > rb.y1 + tol;
  if (side === "s") return Math.abs(ra.y2 - rb.y1) <= tol && ra.x1 < rb.x2 - tol && ra.x2 > rb.x1 + tol;
  return Math.abs(ra.y1 - rb.y2) <= tol && ra.x1 < rb.x2 - tol && ra.x2 > rb.x1 + tol;
}

function worldBounds(room: AptRoom) {
  const c = roomCenter(room);
  const { w, d } = roomSize(room);
  return { minX: c.x - w / 2, maxX: c.x + w / 2, minZ: c.z - d / 2, maxZ: c.z + d / 2 };
}

function overlapDoor(a: AptRoom, b: AptRoom, side: DoorSide): Omit<HomeDoorway, "id" | "roomA" | "roomB"> | null {
  const ba = worldBounds(a);
  const bb = worldBounds(b);

  if (side === "e" || side === "w") {
    const overlapMinZ = Math.max(ba.minZ, bb.minZ);
    const overlapMaxZ = Math.min(ba.maxZ, bb.maxZ);
    const overlap = overlapMaxZ - overlapMinZ;
    if (overlap < DOOR_MIN * 0.5) return null;

    const span = Math.min(DOOR_MAX, Math.max(DOOR_MIN, overlap * 0.55));
    const cx = side === "e" ? (ba.maxX + bb.minX) / 2 : (ba.minX + bb.maxX) / 2;
    const cz = (overlapMinZ + overlapMaxZ) / 2;
    return { side, cx, cz, span, axis: "x", swing: side === "e" ? 1 : -1 };
  }

  const overlapMinX = Math.max(ba.minX, bb.minX);
  const overlapMaxX = Math.min(ba.maxX, bb.maxX);
  const overlap = overlapMaxX - overlapMinX;
  if (overlap < DOOR_MIN * 0.5) return null;

  const span = Math.min(DOOR_MAX, Math.max(DOOR_MIN, overlap * 0.55));
  const cz = side === "s" ? (ba.maxZ + bb.minZ) / 2 : (ba.minZ + bb.maxZ) / 2;
  const cx = (overlapMinX + overlapMaxX) / 2;
  return { side, cx, cz, span, axis: "z", swing: side === "s" ? 1 : -1 };
}

const doorwayCache = new WeakMap<AptRoom[], HomeDoorway[]>();

/** 복도·현관 접점에만 문 — 옆방 직통·발코니 연결 금지 */
function allowsDoorwayBetween(a: AptRoom, b: AptRoom): boolean {
  if (a.type === "balcony" || b.type === "balcony") return false;

  const corridorId = "hall-corridor";
  const touchesCorridor = a.id === corridorId || b.id === corridorId;
  const touchesEntrance = a.id === "entrance" || b.id === "entrance";

  if (touchesCorridor) {
    const other = a.id === corridorId ? b : a;
    // 엘리베이터실은 문 대신 개방형 승강장 — 복도와 직접 연결
    if (other.id === "elevator" || a.id === "elevator") return false;
    return (
      other.type === "living" ||
      other.type === "bedroom" ||
      other.type === "bathroom" ||
      other.type === "kitchen" ||
      other.id === "entrance"
    );
  }

  if (touchesEntrance) {
    const other = a.id === "entrance" ? b : a;
    return other.id === corridorId;
  }

  return false;
}

function appendExitDoor(rooms: AptRoom[], doorways: HomeDoorway[]) {
  const entrance = rooms.find((r) => r.id === "entrance");
  if (!entrance) return;

  const c = roomCenter(entrance);
  const { w } = roomSize(entrance);
  doorways.push({
    id: "exit|outside",
    roomA: "entrance",
    roomB: EXIT_ROOM_ID,
    side: "w",
    cx: c.x - w / 2,
    cz: c.z,
    span: 0.52,
    axis: "x",
    swing: 1,
  });
}

export function computeHomeDoorways(rooms: AptRoom[]): HomeDoorway[] {
  const cached = doorwayCache.get(rooms);
  if (cached) return cached;

  const doorways: HomeDoorway[] = [];
  const seen = new Set<string>();

  for (const a of rooms) {
    for (const side of ["n", "s", "e", "w"] as DoorSide[]) {
      for (const b of rooms) {
        if (a.id === b.id || !sharesEdge(a, b, side)) continue;
        if (!allowsDoorwayBetween(a, b)) continue;
        const key = [a.id, b.id].sort().join("|");
        if (seen.has(key)) continue;
        seen.add(key);

        const spec = overlapDoor(a, b, side);
        if (!spec) continue;
        doorways.push({ id: key, roomA: a.id, roomB: b.id, ...spec });
      }
    }
  }

  appendExitDoor(rooms, doorways);

  doorwayCache.set(rooms, doorways);
  return doorways;
}

export function isExitDoor(door: HomeDoorway): boolean {
  return door.roomB === EXIT_ROOM_ID;
}

export function isInDoorPortal(x: number, z: number, door: HomeDoorway): boolean {
  const pad = 0.08;
  if (door.axis === "x") {
    return Math.abs(x - door.cx) <= DOOR_PORTAL_DEPTH / 2 + pad && Math.abs(z - door.cz) <= door.span / 2 + pad;
  }
  return Math.abs(z - door.cz) <= DOOR_PORTAL_DEPTH / 2 + pad && Math.abs(x - door.cx) <= door.span / 2 + pad;
}

export function isNearDoor(x: number, z: number, door: HomeDoorway): boolean {
  return Math.hypot(x - door.cx, z - door.cz) < DOOR_OPEN_DIST;
}

export function doorwayForRoomSide(roomId: string, side: DoorSide, doorways: HomeDoorway[]): HomeDoorway | null {
  return (
    doorways.find(
      (d) =>
        (d.roomA === roomId && d.side === side) ||
        (d.roomB === roomId && d.roomB !== EXIT_ROOM_ID && oppositeSide(d.side) === side) ||
        (d.roomA === roomId && d.roomB === EXIT_ROOM_ID && d.side === side)
    ) ?? null
  );
}

function oppositeSide(side: DoorSide): DoorSide {
  const map: Record<DoorSide, DoorSide> = { n: "s", s: "n", e: "w", w: "e" };
  return map[side];
}
