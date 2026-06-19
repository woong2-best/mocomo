import type { AptProfileDto } from "@/actions/apt";
import { APT_DEFAULT_FLOOR } from "@/lib/apt/constants";
import { createDefaultFloorPlan } from "@/lib/apt/floor-plan-logic";
import { getRoomsForFloor } from "@/lib/apt/floor-plan-store";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { defaultItemsForRooms, migrateItems } from "./home-floor-meshes";
import { DEFAULT_BONDEE_HOME, type BondeeHomeState } from "./types";

function parseBondee(raw: unknown, rooms: AptRoom[]): BondeeHomeState {
  if (raw && typeof raw === "object" && "avatar" in (raw as object)) {
    const o = raw as BondeeHomeState;
    const items = o.items?.length ? migrateItems(o.items, rooms) : defaultItemsForRooms(rooms);
    return {
      ...DEFAULT_BONDEE_HOME,
      ...o,
      items,
      activeRoomId: o.activeRoomId ?? rooms.find((r) => r.id === "living-main")?.id ?? rooms.find((r) => r.type === "living")?.id ?? rooms[0]?.id,
    };
  }
  return {
    ...DEFAULT_BONDEE_HOME,
    items: defaultItemsForRooms(rooms),
    activeRoomId: rooms.find((r) => r.id === "living-main")?.id ?? rooms.find((r) => r.type === "living")?.id ?? rooms[0]?.id,
  };
}

export function bondeeFromAptProfile(profile: AptProfileDto | null): {
  home: BondeeHomeState;
  rooms: AptRoom[];
} {
  const rooms = profile
    ? getRoomsForFloor(profile.floorPlans, profile.homeFloor)
    : createDefaultFloorPlan().rooms;
  const sim = profile?.simulation as Record<string, unknown> | undefined;
  return { home: parseBondee(sim?.bondee, rooms), rooms };
}

export function bondeeFromAptRow(
  row: { floorPlans: unknown; homeFloor: number | null; simulationState: unknown } | null,
  homeFloor = APT_DEFAULT_FLOOR
): { home: BondeeHomeState; rooms: AptRoom[] } {
  if (!row) {
    const rooms = createDefaultFloorPlan().rooms;
    return { home: parseBondee(null, rooms), rooms };
  }
  const floor = row.homeFloor ?? homeFloor;
  const plans =
    row.floorPlans && typeof row.floorPlans === "object"
      ? (row.floorPlans as Record<number, AptRoom[]>)
      : { [floor]: createDefaultFloorPlan().rooms };
  const rooms = getRoomsForFloor(plans, floor);
  const sim = (row.simulationState ?? {}) as Record<string, unknown>;
  return { home: parseBondee(sim.bondee, rooms), rooms };
}
