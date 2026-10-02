import type { AptRoom } from "@/lib/apt/floor-plan-types";

export type ActivityKind =
  | "idle"
  | "walk"
  | "cook"
  | "clean"
  | "watch_tv"
  | "sleep"
  | "relax"
  | "laundry";

export type FurnitureType = "tv" | "sofa" | "bed" | "washer";

export type FurnitureItem = {
  id: string;
  type: FurnitureType;
  roomId: string;
  x: number;
  z: number;
  active?: boolean;
};

export type ResidentAgent = {
  id: string;
  userId: string;
  displayName: string;
  vrmUrl: string;
  isOwner: boolean;
  roomId: string;
  activity: ActivityKind;
  activityLabel: string;
  progress: number;
  duration: number;
  x: number;
  z: number;
  targetX: number;
  targetZ: number;
  rotation: number;
  energy: number;
  mood: number;
};

export type SimulationSnapshot = {
  residents: ResidentAgent[];
  furniture: FurnitureItem[];
  simClock: number;
  dayPhase: "morning" | "afternoon" | "evening" | "night";
};

export type ActivityDef = {
  kind: ActivityKind;
  label: string;
  duration: number;
  preferredRooms: string[];
  requiresFurniture?: FurnitureType;
  energyDelta: number;
  moodDelta: number;
};

export const ACTIVITY_DEFS: Record<ActivityKind, ActivityDef> = {
  idle: { kind: "idle", label: "대기", duration: 4, preferredRooms: ["living", "hall"], energyDelta: 2, moodDelta: 0 },
  walk: { kind: "walk", label: "이동", duration: 2.5, preferredRooms: [], energyDelta: -1, moodDelta: 0 },
  cook: { kind: "cook", label: "요리", duration: 8, preferredRooms: ["kitchen"], energyDelta: -3, moodDelta: 4 },
  clean: { kind: "clean", label: "청소", duration: 7, preferredRooms: ["bathroom", "entrance", "hall"], energyDelta: -4, moodDelta: 2 },
  watch_tv: { kind: "watch_tv", label: "TV 시청", duration: 12, preferredRooms: ["living"], requiresFurniture: "tv", energyDelta: 3, moodDelta: 6 },
  sleep: { kind: "sleep", label: "수면", duration: 15, preferredRooms: ["bedroom", "living"], energyDelta: 12, moodDelta: 3 },
  relax: { kind: "relax", label: "휴식", duration: 6, preferredRooms: ["living", "bedroom"], energyDelta: 5, moodDelta: 4 },
  laundry: { kind: "laundry", label: "빨래", duration: 9, preferredRooms: ["bathroom", "hall"], energyDelta: -3, moodDelta: 1 },
};

export function defaultFurnitureForPlan(rooms: AptRoom[]): FurnitureItem[] {
  const living = rooms.find((r) => r.type === "living") ?? rooms.find((r) => r.type === "bedroom");
  if (!living) return [];
  return [
    {
      id: "tv-main",
      type: "tv",
      roomId: living.id,
      x: 0.35,
      z: -0.2,
      active: false,
    },
    {
      id: "sofa-main",
      type: "sofa",
      roomId: living.id,
      x: -0.15,
      z: 0.1,
    },
  ];
}

export function defaultResidents(owner: { userId: string; displayName: string }): ResidentAgent[] {
  const base = (id: string, name: string, userId: string, isOwner: boolean): ResidentAgent => ({
    id,
    userId,
    displayName: name,
    vrmUrl: "/avatars/default.vrm",
    isOwner,
    roomId: "living",
    activity: "idle",
    activityLabel: "입주 준비",
    progress: 0,
    duration: 3,
    x: 0,
    z: 0,
    targetX: 0,
    targetZ: 0,
    rotation: 0,
    energy: 80,
    mood: 75,
  });
  return [
    { ...base("owner", owner.displayName, owner.userId, true), roomId: "entrance" },
    { ...base("neighbor-1", "이웃 아바타", "demo-neighbor", false), roomId: "hall", mood: 60 },
  ];
}
