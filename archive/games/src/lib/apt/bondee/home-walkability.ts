import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { roomCenter, roomSize } from "@/lib/apt/building-from-plan";
import { computeHomeDoorways, isInDoorPortal } from "./home-doorways";
import { walkInsetForSide } from "./home-walls";

function roomBounds(room: AptRoom, rooms: AptRoom[]) {
  const c = roomCenter(room);
  const { w, d } = roomSize(room);
  return {
    minX: c.x - w / 2 + walkInsetForSide(room, rooms, "w"),
    maxX: c.x + w / 2 - walkInsetForSide(room, rooms, "e"),
    minZ: c.z - d / 2 + walkInsetForSide(room, rooms, "n"),
    maxZ: c.z + d / 2 - walkInsetForSide(room, rooms, "s"),
  };
}

/** Walkable inside a room or through a door portal between rooms. */
export function isWalkable(x: number, z: number, rooms: AptRoom[]): boolean {
  const doorways = computeHomeDoorways(rooms);
  for (const door of doorways) {
    if (isInDoorPortal(x, z, door)) return true;
  }

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
