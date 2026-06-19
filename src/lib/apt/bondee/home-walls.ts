import { PLAN_H, PLAN_W, type AptRoom } from "@/lib/apt/floor-plan-types";
import { SCALE } from "@/lib/apt/building-from-plan";
import { computeHomeDoorways, doorwayForRoomSide, type HomeDoorway } from "./home-doorways";

/** 집 벽 종류 — 외벽(집 경계) / 내벽(방 구분) */
export type HomeWallType = "EXTERIOR" | "INTERIOR";

export type HomeWallSide = "n" | "s" | "e" | "w";

/**
 * 평면도 기준 벽 세그먼트.
 * start/end는 plan 좌표(mm 축소 단위)이며, height·thickness는 world 단위.
 */
export type HomeWall = {
  id: string;
  type: HomeWallType;
  roomId: string;
  side: HomeWallSide;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  height: number;
  thickness: number;
};

export const HOME_WALL_BASE_HEIGHT = 1.12;

export const HOME_WALL_RENDER = {
  EXTERIOR: {
    opacity: 1.0,
    occludeOpacity: 0.22,
    thicknessPlan: 14,
    heightMul: 1.12,
    castShadow: true,
  },
  INTERIOR: {
    opacity: 0.35,
    occludeOpacity: 0.35,
    thicknessPlan: 5,
    heightMul: 0.94,
    castShadow: false,
  },
} as const;

export function wallThicknessWorld(type: HomeWallType): number {
  return HOME_WALL_RENDER[type].thicknessPlan * SCALE;
}

export function wallHeightWorld(baseHeight: number, type: HomeWallType): number {
  return baseHeight * HOME_WALL_RENDER[type].heightMul;
}

export function planRect(room: AptRoom) {
  return { x1: room.x, y1: room.y, x2: room.x + room.w, y2: room.y + room.h };
}

/** 맵 최외곽에 닿는 변 = 외벽 */
export function isExteriorPlanEdge(room: AptRoom, side: HomeWallSide, tol = 1): boolean {
  const r = planRect(room);
  if (side === "w" && r.x1 <= tol) return true;
  if (side === "n" && r.y1 <= tol) return true;
  if (side === "s" && r.y2 >= PLAN_H - tol) return true;
  if (side === "e" && r.x2 >= PLAN_W - tol) return true;
  return false;
}

export function sharesPlanEdge(a: AptRoom, b: AptRoom, side: HomeWallSide, tol = 2): boolean {
  const ra = planRect(a);
  const rb = planRect(b);
  if (side === "e") return Math.abs(ra.x2 - rb.x1) <= tol && ra.y1 < rb.y2 - tol && ra.y2 > rb.y1 + tol;
  if (side === "w") return Math.abs(ra.x1 - rb.x2) <= tol && ra.y1 < rb.y2 - tol && ra.y2 > rb.y1 + tol;
  if (side === "s") return Math.abs(ra.y2 - rb.y1) <= tol && ra.x1 < rb.x2 - tol && ra.x2 > rb.x1 + tol;
  return Math.abs(ra.y1 - rb.y2) <= tol && ra.x1 < rb.x2 - tol && ra.x2 > rb.x1 + tol;
}

export function hasRoomNeighbor(room: AptRoom, rooms: AptRoom[], side: HomeWallSide): boolean {
  return rooms.some((o) => o.id !== room.id && sharesPlanEdge(room, o, side));
}

/** 방 변의 벽 종류 자동 분류 */
export function classifyWallEdge(room: AptRoom, rooms: AptRoom[], side: HomeWallSide): HomeWallType {
  if (isExteriorPlanEdge(room, side) || room.type === "balcony") return "EXTERIOR";
  if (hasRoomNeighbor(room, rooms, side)) return "INTERIOR";
  return "EXTERIOR";
}

function planSegment(room: AptRoom, side: HomeWallSide) {
  const r = planRect(room);
  switch (side) {
    case "n":
      return { startX: r.x1, startY: r.y1, endX: r.x2, endY: r.y1 };
    case "s":
      return { startX: r.x1, startY: r.y2, endX: r.x2, endY: r.y2 };
    case "w":
      return { startX: r.x1, startY: r.y1, endX: r.x1, endY: r.y2 };
    case "e":
      return { startX: r.x2, startY: r.y1, endX: r.x2, endY: r.y2 };
  }
}

export type HomeWallBuildKind = "solid" | "door" | "skip";

export function resolveWallBuild(
  room: AptRoom,
  side: HomeWallSide,
  rooms: AptRoom[],
  doorways: HomeDoorway[]
): { type: HomeWallType; kind: HomeWallBuildKind; doorway?: HomeDoorway } {
  const exterior = isExteriorPlanEdge(room, side) || room.type === "balcony";
  const neighbor = hasRoomNeighbor(room, rooms, side);

  if (!neighbor || exterior) {
    return { type: exterior ? "EXTERIOR" : "INTERIOR", kind: "solid" };
  }

  const doorway = doorwayForRoomSide(room.id, side, doorways);
  if (doorway) {
    if (doorway.roomA === room.id) return { type: "INTERIOR", kind: "door", doorway };
    return { type: "INTERIOR", kind: "skip" };
  }

  return { type: "INTERIOR", kind: "solid" };
}

/** 집 생성 시 모든 벽 세그먼트를 EXTERIOR / INTERIOR 로 분류 */
export function deriveHomeWalls(rooms: AptRoom[], baseWallHeight = HOME_WALL_BASE_HEIGHT): HomeWall[] {
  const doorways = computeHomeDoorways(rooms);
  const walls: HomeWall[] = [];
  let seq = 0;

  for (const room of rooms) {
    for (const side of ["n", "s", "e", "w"] as const) {
      const resolved = resolveWallBuild(room, side, rooms, doorways);
      if (resolved.kind !== "solid") continue;

      const type = resolved.type;
      const seg = planSegment(room, side);
      walls.push({
        id: `${room.id}-${side}-${seq++}`,
        type,
        roomId: room.id,
        side,
        ...seg,
        height: wallHeightWorld(baseWallHeight, type),
        thickness: wallThicknessWorld(type),
      });
    }
  }

  return walls;
}

export const EXTERIOR_WALK_INSET = 0.1;
export const INTERIOR_WALK_INSET = 0.02;

export function walkInsetForSide(room: AptRoom, rooms: AptRoom[], side: HomeWallSide): number {
  const type = classifyWallEdge(room, rooms, side);
  return type === "EXTERIOR" ? EXTERIOR_WALK_INSET : INTERIOR_WALK_INSET;
}

/** 평면도 방향 → world XZ 법선 (카메라 남동쪽 구도) */
export function planSideWorldNormal(side: HomeWallSide): { x: number; z: number } {
  switch (side) {
    case "n":
      return { x: 0, z: -1 };
    case "s":
      return { x: 0, z: 1 };
    case "e":
      return { x: 1, z: 0 };
    case "w":
      return { x: -1, z: 0 };
  }
}

/** 회전 각도에 따라 카메라를 향하는 벽인지 (투명 벽 후보) */
export function wallSideFacesCamera(side: HomeWallSide, camYaw: number, threshold = 0.22): boolean {
  const camDirX = Math.sin(camYaw);
  const camDirZ = Math.cos(camYaw);
  const n = planSideWorldNormal(side);
  return n.x * camDirX + n.z * camDirZ > threshold;
}
