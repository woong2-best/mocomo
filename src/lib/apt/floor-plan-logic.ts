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

/** 구상도 기반 Bondee 아파트 — 틈 없이 타일링되는 직사각형 구조 */
export function createDefaultFloorPlan(): FloorPlanState {
  return {
    rooms: [
      {
        id: "living",
        type: "living",
        x: 0,
        y: 0,
        w: 440,
        h: 420,
        label: "거실",
        locked: false,
        floor: "wood",
      },
      {
        id: "living-open",
        type: "living",
        x: 440,
        y: 130,
        w: 430,
        h: 290,
        label: "거실",
        locked: false,
        floor: "wood",
      },
      {
        id: "bathroom",
        type: "bathroom",
        x: 440,
        y: 0,
        w: 190,
        h: 130,
        label: "화장실",
        locked: true,
        floor: "bathroom",
      },
      {
        id: "entrance",
        type: "entrance",
        x: 630,
        y: 0,
        w: 240,
        h: 130,
        label: "현관",
        locked: true,
        floor: "tile-check",
      },
      {
        id: "kitchen",
        type: "kitchen",
        x: 0,
        y: 420,
        w: 870,
        h: 150,
        label: "주방/식당",
        locked: true,
        floor: "wood",
      },
      {
        id: "balcony",
        type: "balcony",
        x: 870,
        y: 0,
        w: 130,
        h: PLAN_H,
        label: "발코니",
        locked: true,
        floor: "balcony",
      },
    ],
  };
}

/** 이전(복도·침실 분할) 평면도 → 구상도 레이아웃으로 교체 */
export function isLegacyFloorPlan(rooms: AptRoom[]): boolean {
  if (!rooms.length) return true;
  return rooms.some(
    (r) =>
      r.id === "bedroom-a" ||
      r.id === "bedroom-b" ||
      r.id === "hall" ||
      (r.type === "living" && r.x > 500)
  );
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
      return "주방/식당";
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
