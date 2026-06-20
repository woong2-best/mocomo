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
 * 오픈형 Bondee 아파트 (v5)
 *
 * ┌─방2──┬─방1──┬화장실┬엘리베이터┐  ← 상단: 방들 (각자 벽 + 복도 문 1개)
 * ├──────┴──────┴──────┴──────────┤
 * │            복 도               │  ← 복도 (방 출입)
 * ├───────────────┬───────────────┤
 * │     거실      │     부엌      │  ← 하단: 거실+부엌 (벽 없는 하나의 오픈 공간)
 * └───────────────┴───────────────┘
 *
 * 거실·부엌·복도는 벽 없이 트여 하나의 큰 공간을 이루고,
 * 윗줄 방들은 복도로 통하는 문 1개씩만 둔다.
 */
export function createDefaultFloorPlan(): FloorPlanState {
  const INTERIOR_W = 870;
  const TOP_H = 240;
  const HALL_H = 90;
  const BOTTOM_Y = TOP_H + HALL_H;
  const BOTTOM_H = PLAN_H - BOTTOM_Y;

  return {
    rooms: [
      {
        id: "bedroom-2",
        type: "bedroom",
        x: 0,
        y: 0,
        w: 250,
        h: TOP_H,
        label: "방 2",
        locked: false,
        floor: "beige",
      },
      {
        id: "bedroom-1",
        type: "bedroom",
        x: 250,
        y: 0,
        w: 250,
        h: TOP_H,
        label: "방 1",
        locked: false,
        floor: "beige",
      },
      {
        id: "bathroom",
        type: "bathroom",
        x: 500,
        y: 0,
        w: 190,
        h: TOP_H,
        label: "화장실",
        locked: true,
        floor: "bathroom",
      },
      {
        id: "elevator",
        type: "hall",
        x: 690,
        y: 0,
        w: 180,
        h: TOP_H,
        label: "엘리베이터",
        locked: true,
        floor: "tile-light",
      },
      {
        id: "hall-corridor",
        type: "hall",
        x: 0,
        y: TOP_H,
        w: INTERIOR_W,
        h: HALL_H,
        label: "복도",
        locked: true,
        floor: "beige",
      },
      {
        id: "living",
        type: "living",
        x: 0,
        y: BOTTOM_Y,
        w: 480,
        h: BOTTOM_H,
        label: "거실",
        locked: false,
        floor: "wood",
      },
      {
        id: "kitchen",
        type: "kitchen",
        x: 480,
        y: BOTTOM_Y,
        w: INTERIOR_W - 480,
        h: BOTTOM_H,
        label: "부엌",
        locked: true,
        floor: "wood",
      },
      {
        id: "balcony",
        type: "balcony",
        x: INTERIOR_W,
        y: 0,
        w: PLAN_W - INTERIOR_W,
        h: PLAN_H,
        label: "발코니",
        locked: true,
        floor: "balcony",
      },
    ],
  };
}

/** 오픈형 v5 평면도 — 거실이 복도 아래(오픈 공간)에 있으면 최신 */
export function isSketchFloorPlan(rooms: AptRoom[]): boolean {
  const living = rooms.find((r) => r.id === "living");
  const corridor = rooms.find((r) => r.id === "hall-corridor");
  const kitchen = rooms.find((r) => r.id === "kitchen");
  return Boolean(living && corridor && kitchen && living.y > corridor.y);
}

export function isLegacyFloorPlan(rooms: AptRoom[]): boolean {
  return !isSketchFloorPlan(rooms);
}

export function migrateFloorPlan(rooms: AptRoom[]): AptRoom[] {
  if (!rooms.length || isLegacyFloorPlan(rooms)) {
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
  const interior: Rect = { x: 0, y: 0, w: 870, h: PLAN_H };
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
