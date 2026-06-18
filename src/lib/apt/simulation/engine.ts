import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { ACTIVITY_DEFS, type ActivityKind, type FurnitureItem, type ResidentAgent, type SimulationSnapshot } from "./types";
import { buildRoomAdjacency, findRoomById, pickRandomRoom, randomPointInRoom, resolveRoomId } from "./rooms";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function hasFurnitureInRoom(furniture: FurnitureItem[], roomId: string, type: FurnitureItem["type"]) {
  return furniture.some((f) => f.roomId === roomId && f.type === type);
}

function pickNextActivity(resident: ResidentAgent, rooms: AptRoom[], furniture: FurnitureItem[], phase: SimulationSnapshot["dayPhase"]): ActivityKind {
  const weights: { kind: ActivityKind; w: number }[] = [
    { kind: "walk", w: 2 },
    { kind: "relax", w: 2 },
    { kind: "cook", w: phase === "morning" || phase === "evening" ? 4 : 1 },
    { kind: "clean", w: 2 },
    { kind: "watch_tv", w: hasFurnitureInRoom(furniture, resident.roomId, "tv") ? 5 : 0 },
    { kind: "sleep", w: phase === "night" ? 8 : resident.energy < 35 ? 5 : 0 },
    { kind: "laundry", w: 1 },
    { kind: "idle", w: 1 },
  ];

  if (!hasFurnitureInRoom(furniture, resolveRoomId(rooms, "living"), "tv")) {
    const idx = weights.findIndex((x) => x.kind === "watch_tv");
    if (idx >= 0) weights[idx].w = 0;
  }

  const total = weights.reduce((s, x) => s + x.w, 0);
  let roll = Math.random() * total;
  for (const item of weights) {
    roll -= item.w;
    if (roll <= 0) return item.kind;
  }
  return "idle";
}

function targetRoomForActivity(kind: ActivityKind, rooms: AptRoom[], furniture: FurnitureItem[]) {
  const def = ACTIVITY_DEFS[kind];
  if (kind === "watch_tv") {
    const tv = furniture.find((f) => f.type === "tv");
    if (tv) return findRoomById(rooms, tv.roomId) ?? pickRandomRoom(rooms, ["living"]);
  }
  if (def.preferredRooms.length) {
    const types = def.preferredRooms as AptRoom["type"][];
    return pickRandomRoom(rooms, types);
  }
  return pickRandomRoom(rooms);
}

function startActivity(resident: ResidentAgent, kind: ActivityKind, rooms: AptRoom[], furniture: FurnitureItem[]) {
  const def = ACTIVITY_DEFS[kind];
  const room = targetRoomForActivity(kind, rooms, furniture);
  if (!room) return resident;

  const pos = kind === "walk" ? randomPointInRoom(room) : randomPointInRoom(room);
  const next: ResidentAgent = {
    ...resident,
    activity: kind,
    activityLabel: def.label,
    progress: 0,
    duration: def.duration * (0.85 + Math.random() * 0.3),
    roomId: room.id,
    targetX: pos.x,
    targetZ: pos.z,
  };

  if (kind !== "walk") {
    next.x = pos.x;
    next.z = pos.z;
  }
  return next;
}

function moveToward(resident: ResidentAgent, dt: number, speed = 1.4) {
  const dx = resident.targetX - resident.x;
  const dz = resident.targetZ - resident.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.05) return { ...resident, activity: resident.activity === "walk" ? "idle" : resident.activity };
  const step = speed * dt;
  const t = Math.min(1, step / dist);
  const x = resident.x + dx * t;
  const z = resident.z + dz * t;
  const rotation = Math.atan2(dx, dz);
  return { ...resident, x, z, rotation, activityLabel: "이동 중", activity: "walk" as const };
}

export function createInitialSnapshot(
  residents: ResidentAgent[],
  furniture: FurnitureItem[],
  rooms: AptRoom[]
): SimulationSnapshot {
  const placed = residents.map((r) => {
    const room = findRoomById(rooms, resolveRoomId(rooms, r.roomId)) ?? rooms[0];
    const p = room ? randomPointInRoom(room) : { x: 0, z: 0 };
    return { ...r, x: p.x, z: p.z, targetX: p.x, targetZ: p.z };
  });
  return { residents: placed, furniture, simClock: 8 * 3600, dayPhase: "morning" };
}

export function tickSimulation(snapshot: SimulationSnapshot, rooms: AptRoom[], dt: number): SimulationSnapshot {
  const simClock = snapshot.simClock + dt;
  const hour = (simClock / 3600) % 24;
  const dayPhase: SimulationSnapshot["dayPhase"] =
    hour < 6 ? "night" : hour < 12 ? "morning" : hour < 18 ? "afternoon" : hour < 22 ? "evening" : "night";

  const furniture = snapshot.furniture.map((f) => ({
    ...f,
    active: snapshot.residents.some(
      (r) => r.activity === "watch_tv" && r.progress > 0.15 && f.type === "tv" && f.roomId === r.roomId
    ),
  }));

  const residents = snapshot.residents.map((resident) => {
    let r = { ...resident };

    if (r.activity === "walk" || (Math.hypot(r.targetX - r.x, r.targetZ - r.z) > 0.08 && r.progress < 0.05)) {
      r = moveToward(r, dt);
      if (Math.hypot(r.targetX - r.x, r.targetZ - r.z) < 0.08 && r.activity === "walk") {
        r = startActivity({ ...r, activity: "idle", progress: 0 }, pickNextActivity(r, rooms, furniture, dayPhase), rooms, furniture);
      }
      return r;
    }

    r.progress += dt / Math.max(0.5, r.duration);
    const def = ACTIVITY_DEFS[r.activity];
    r.energy = clamp(r.energy + def.energyDelta * dt * 0.08, 0, 100);
    r.mood = clamp(r.mood + def.moodDelta * dt * 0.06, 0, 100);

    if (r.progress >= 1) {
      const next = pickNextActivity(r, rooms, furniture, dayPhase);
      if (next === "walk" || ACTIVITY_DEFS[next].preferredRooms.length) {
        const room = targetRoomForActivity(next, rooms, furniture);
        if (room) {
          const p = randomPointInRoom(room);
          return startActivity(
            { ...r, progress: 0, targetX: p.x, targetZ: p.z, roomId: room.id },
            "walk",
            rooms,
            furniture
          );
        }
      }
      return startActivity({ ...r, progress: 0 }, next, rooms, furniture);
    }

    return r;
  });

  return { residents, furniture, simClock, dayPhase };
}

export function placeTvInLiving(rooms: AptRoom[], furniture: FurnitureItem[]) {
  const living = rooms.find((r) => r.type === "living");
  if (!living) return furniture;
  if (furniture.some((f) => f.type === "tv")) return furniture;
  return [
    ...furniture,
    { id: `tv-${Date.now()}`, type: "tv" as const, roomId: living.id, x: 0.3, z: -0.15, active: false },
  ];
}
