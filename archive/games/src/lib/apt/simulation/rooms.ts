import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { roomCenter } from "@/lib/apt/building-from-plan";

export function roomWorldPos(room: AptRoom, offsetX = 0, offsetZ = 0) {
  const c = roomCenter(room);
  return { x: c.x + offsetX, z: c.z + offsetZ };
}

export function findRoomById(rooms: AptRoom[], id: string) {
  return rooms.find((r) => r.id === id || r.id.startsWith(id));
}

export function findRoomByType(rooms: AptRoom[], type: AptRoom["type"]) {
  return rooms.find((r) => r.type === type);
}

export function resolveRoomId(rooms: AptRoom[], hint: string) {
  const byId = rooms.find((r) => r.id === hint);
  if (byId) return byId.id;
  const byType = rooms.find((r) => r.type === hint);
  return byType?.id ?? rooms[0]?.id ?? hint;
}

function sharesEdge(a: AptRoom, b: AptRoom) {
  const ax2 = a.x + a.w;
  const ay2 = a.y + a.h;
  const bx2 = b.x + b.w;
  const by2 = b.y + b.h;
  const tol = 3;
  const v =
    (Math.abs(ax2 - b.x) <= tol || Math.abs(bx2 - a.x) <= tol) &&
    a.y < by2 - tol &&
    ay2 > b.y + tol;
  const h =
    (Math.abs(ay2 - b.y) <= tol || Math.abs(by2 - a.y) <= tol) &&
    a.x < bx2 - tol &&
    ax2 > b.x + tol;
  return v || h;
}

export function buildRoomAdjacency(rooms: AptRoom[]) {
  const adj = new Map<string, string[]>();
  for (const r of rooms) adj.set(r.id, []);
  for (const a of rooms) {
    for (const b of rooms) {
      if (a.id === b.id) continue;
      if (b.type === "balcony") continue;
      if (sharesEdge(a, b)) adj.get(a.id)!.push(b.id);
    }
  }
  return adj;
}

export function pickRandomRoom(rooms: AptRoom[], types?: AptRoom["type"][]) {
  const pool = types?.length ? rooms.filter((r) => types.includes(r.type) && r.type !== "balcony") : rooms.filter((r) => r.type !== "balcony");
  return pool[Math.floor(Math.random() * pool.length)] ?? rooms[0];
}

export function randomPointInRoom(room: AptRoom) {
  const margin = 0.15;
  const ox = (Math.random() - 0.5) * room.w * 0.006 * (1 - margin);
  const oz = (Math.random() - 0.5) * room.h * 0.006 * (1 - margin);
  return roomWorldPos(room, ox, oz);
}
