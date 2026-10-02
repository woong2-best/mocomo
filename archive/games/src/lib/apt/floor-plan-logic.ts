import {
  PLAN_H,
  PLAN_W,
  WALL,
  type AptRoom,
  type FloorPlanState,
  type RoomType,
} from "./floor-plan-types";

let roomSeq = 0;
export function newRoomId() {
  roomSeq += 1;
  return `room-${roomSeq}`;
}

/**
 * 빈 집 dollhouse 구조 (참조 평면도)
 *
 * ┌──────거실──────┬욕실┬──── 방1 ────┐
 * │   (좌측 전체)  │    │            │
 * │                │복도│    방2      │
 * │                │현관│            │
 * └────────────────┴────┴────────────┘
 */
export function createDefaultFloorPlan(): FloorPlanState {
  const LIVING_W = 400;
  const HALL_W = 120;
  const TOP_H = 185;
  const HALL_H = 250;
  const ENTRANCE_H = PLAN_H - TOP_H - HALL_H;
  const RIGHT_W = PLAN_W - LIVING_W - HALL_W;

  return {
    rooms: [
      {
        id: "living",
        type: "living",
        x: 0,
        y: 0,
        w: LIVING_W,
        h: PLAN_H,
        label: "거실",
        locked: false,
        floor: "beige",
      },
      {
        id: "bathroom",
        type: "bathroom",
        x: LIVING_W,
        y: 0,
        w: HALL_W,
        h: TOP_H,
        label: "화장실",
        locked: true,
        floor: "bathroom",
      },
      {
        id: "bedroom-1",
        type: "bedroom",
        x: LIVING_W + HALL_W,
        y: 0,
        w: RIGHT_W,
        h: TOP_H,
        label: "방 1",
        locked: false,
        floor: "wood",
      },
      {
        id: "hall-corridor",
        type: "hall",
        x: LIVING_W,
        y: TOP_H,
        w: HALL_W,
        h: HALL_H,
        label: "복도",
        locked: true,
        floor: "beige",
      },
      {
        id: "entrance",
        type: "entrance",
        x: LIVING_W,
        y: TOP_H + HALL_H,
        w: HALL_W,
        h: ENTRANCE_H,
        label: "현관",
        locked: true,
        floor: "tile-light",
      },
      {
        id: "bedroom-2",
        type: "bedroom",
        x: LIVING_W + HALL_W,
        y: TOP_H,
        w: RIGHT_W,
        h: PLAN_H - TOP_H,
        label: "방 2",
        locked: false,
        floor: "wood",
      },
    ],
  };
}

/** dollhouse — 거실 좌측 전체, 복도·욕실 중앙, 침실 우측 */
export function isDollhouseStructurePlan(rooms: AptRoom[]): boolean {
  const living = rooms.find((r) => r.id === "living");
  const bed2 = rooms.find((r) => r.id === "bedroom-2");
  if (!living || !bed2) return false;
  if (rooms.some((r) => r.id === "kitchen" || r.id === "elevator" || r.id === "bedroom-3")) return false;
  return living.x === 0 && living.y === 0 && living.h >= PLAN_H - 2;
}

/** v6 — 거실이 복도 위, 엘리베이터가 하단, 발코니 없음 */
export function isCorridorV6Plan(rooms: AptRoom[]): boolean {
  const living = rooms.find((r) => r.id === "living");
  const corridor = rooms.find((r) => r.id === "hall-corridor");
  const elevator = rooms.find((r) => r.id === "elevator");
  const entrance = rooms.find((r) => r.id === "entrance");
  if (!living || !corridor || !elevator || !entrance) return false;
  if (rooms.some((r) => r.type === "balcony")) return false;
  return living.y < corridor.y && elevator.y > corridor.y;
}

/** @deprecated use isCorridorV6Plan */
export function isSketchFloorPlan(rooms: AptRoom[]): boolean {
  return isCorridorV6Plan(rooms);
}

export function isLegacyFloorPlan(rooms: AptRoom[]): boolean {
  return !isDollhouseStructurePlan(rooms);
}

export function migrateFloorPlan(rooms: AptRoom[]): AptRoom[] {
  if (!rooms.length || !isDollhouseStructurePlan(rooms)) {
    return createDefaultFloorPlan().rooms.map((r) => ({ ...r }));
  }
  return rooms;
}

export function getFlexibleRooms(rooms: AptRoom[]) {
  return rooms.filter((r) => !r.locked);
}

function overlaps(a: AptRoom, b: AptRoom, gap = 0) {
  return !(
    a.x + a.w + gap <= b.x ||
    b.x + b.w + gap <= a.x ||
    a.y + a.h + gap <= b.y ||
    b.y + b.h + gap <= a.y
  );
}

function touches(a: AptRoom, b: AptRoom) {
  const hTouch =
    a.y === b.y + b.h &&
    a.w === b.w &&
    a.x === b.x &&
    Math.abs(a.y - (b.y + b.h)) < 1;
  const hTouch2 =
    b.y === a.y + a.h &&
    a.w === b.w &&
    a.x === b.x &&
    Math.abs(b.y - (a.y + a.h)) < 1;
  const vTouch =
    a.x === b.x + b.w &&
    a.h === b.h &&
    a.y === b.y &&
    Math.abs(a.x - (b.x + b.w)) < 1;
  const vTouch2 =
    b.x === a.x + a.w &&
    a.h === b.h &&
    a.y === b.y &&
    Math.abs(b.x - (a.x + a.w)) < 1;
  return hTouch || hTouch2 || vTouch || vTouch2;
}

export function canMerge(a: AptRoom, b: AptRoom) {
  if (a.locked || b.locked) return false;
  if (!touches(a, b)) return false;
  const nx = Math.min(a.x, b.x);
  const ny = Math.min(a.y, b.y);
  const nw = Math.max(a.x + a.w, b.x + b.w) - nx;
  const nh = Math.max(a.y + a.h, b.y + b.h) - ny;
  return a.w * a.h + b.w * b.h === nw * nh;
}

export function mergeRooms(rooms: AptRoom[], idA: string, idB: string): AptRoom[] | null {
  const a = rooms.find((r) => r.id === idA);
  const b = rooms.find((r) => r.id === idB);
  if (!a || !b || !canMerge(a, b)) return null;

  const nx = Math.min(a.x, b.x);
  const ny = Math.min(a.y, b.y);
  const nw = Math.max(a.x + a.w, b.x + b.w) - nx;
  const nh = Math.max(a.y + a.h, b.y + b.h) - ny;

  const merged: AptRoom = {
    id: newRoomId(),
    type: a.type === b.type ? a.type : "bedroom",
    x: nx,
    y: ny,
    w: nw,
    h: nh,
    label: a.type === "living" || b.type === "living" ? "거실" : "침실",
    locked: false,
    floor: a.floor === "wood" || b.floor === "wood" ? "wood" : "beige",
  };

  return rooms.filter((r) => r.id !== idA && r.id !== idB).concat(merged);
}

export function removeRoom(rooms: AptRoom[], id: string): AptRoom[] | null {
  const room = rooms.find((r) => r.id === id);
  if (!room || room.locked) return null;
  return rooms.filter((r) => r.id !== id);
}

export function splitRoom(rooms: AptRoom[], id: string): AptRoom[] | null {
  const room = rooms.find((r) => r.id === id);
  if (!room || room.locked) return null;
  if (room.w < 120 && room.h < 120) return null;

  const splitVertical = room.w >= room.h;
  const a: AptRoom = {
    ...room,
    id: newRoomId(),
    w: splitVertical ? Math.floor(room.w / 2) : room.w,
    h: splitVertical ? room.h : Math.floor(room.h / 2),
    label: "침실",
    type: "bedroom",
  };
  const b: AptRoom = {
    ...room,
    id: newRoomId(),
    x: splitVertical ? room.x + a.w : room.x,
    y: splitVertical ? room.y : room.y + a.h,
    w: splitVertical ? room.w - a.w : room.w,
    h: splitVertical ? room.h : room.h - a.h,
    label: "침실",
    type: "bedroom",
  };

  return rooms.filter((r) => r.id !== id).concat(a, b);
}

type Rect = { x: number; y: number; w: number; h: number };

function subtractRect(space: Rect, cut: Rect): Rect[] {
  const ix = Math.max(space.x, cut.x);
  const iy = Math.max(space.y, cut.y);
  const ix2 = Math.min(space.x + space.w, cut.x + cut.w);
  const iy2 = Math.min(space.y + space.h, cut.y + cut.h);
  if (ix >= ix2 || iy >= iy2) return [space];

  const out: Rect[] = [];
  if (iy > space.y) out.push({ x: space.x, y: space.y, w: space.w, h: iy - space.y });
  if (iy2 < space.y + space.h)
    out.push({ x: space.x, y: iy2, w: space.w, h: space.y + space.h - iy2 });
  if (ix > space.x) out.push({ x: space.x, y: iy, w: ix - space.x, h: iy2 - iy });
  if (ix2 < space.x + space.w)
    out.push({ x: ix2, y: iy, w: space.x + space.w - ix2, h: iy2 - iy });
  return out.filter((r) => r.w >= 80 && r.h >= 80);
}

export function findAddableSlot(rooms: AptRoom[]): Rect | null {
  const interior: Rect = { x: 0, y: 0, w: PLAN_W, h: PLAN_H };
  let free: Rect[] = [interior];
  for (const room of rooms) {
    free = free.flatMap((s) => subtractRect(s, room));
  }
  free.sort((a, b) => b.w * b.h - a.w * a.h);
  return free[0] ?? null;
}

export function addRoom(rooms: AptRoom[]): AptRoom[] | null {
  const slot = findAddableSlot(rooms);
  if (!slot) return null;

  const w = Math.min(slot.w, 220);
  const h = Math.min(slot.h, 200);
  const room: AptRoom = {
    id: newRoomId(),
    type: "bedroom",
    x: slot.x,
    y: slot.y,
    w,
    h,
    label: "침실",
    locked: false,
    floor: "beige",
  };

  if (rooms.some((r) => overlaps(r, room, -WALL))) return null;
  return [...rooms, room];
}

export function renameRoom(rooms: AptRoom[], id: string, label: string) {
  return rooms.map((r) => (r.id === id ? { ...r, label } : r));
}

export function defaultLabel(type: RoomType) {
  switch (type) {
    case "kitchen":
      return "부엌";
    case "entrance":
      return "현관";
    case "bathroom":
      return "화장실";
    case "living":
      return "거실";
    case "balcony":
      return "발코니";
    case "hall":
      return "복도";
    default:
      return "침실";
  }
}
