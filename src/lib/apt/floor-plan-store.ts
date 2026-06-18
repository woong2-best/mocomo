import { APT_TOTAL_FLOORS } from "@/lib/apt/constants";
import { createDefaultFloorPlan } from "@/lib/apt/floor-plan-logic";
import type { AptRoom } from "@/lib/apt/floor-plan-types";

const defaultRooms = () => createDefaultFloorPlan().rooms.map((r) => ({ ...r }));

export function getRoomsForFloor(plans: Record<number, AptRoom[]>, floor: number): AptRoom[] {
  return plans[floor] ?? defaultRooms();
}

export function clampFloor(floor: number) {
  return Math.min(APT_TOTAL_FLOORS, Math.max(1, Math.floor(floor) || 1));
}

/** DB/메모리 절약 — 층별 오버라이드만 저장 */
export function emptyFloorPlans(): Record<number, AptRoom[]> {
  return {};
}
