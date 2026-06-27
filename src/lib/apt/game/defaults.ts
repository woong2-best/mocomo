import type { AptGameState, AptMissionDef } from "./types";
import { MAX_ENERGY, regenEnergy } from "./energy";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function createDefaultMissions(): AptMissionDef[] {
  return [
    {
      id: "daily-place-sofa",
      kind: "daily",
      title: "거실에 소파 배치",
      description: "편집 모드에서 소파를 거실에 놓아 보세요",
      target: 1,
      progress: 0,
      goldReward: 500,
      gemReward: 5,
      placeSticker: "sofa",
      completed: false,
      claimed: false,
    },
    {
      id: "daily-place-plant",
      kind: "daily",
      title: "화분으로 분위기 UP",
      description: "식물을 아무 방에나 배치하세요",
      target: 1,
      progress: 0,
      goldReward: 300,
      gemReward: 3,
      placeSticker: "plant",
      completed: false,
      claimed: false,
    },
    {
      id: "daily-visit-friend",
      kind: "daily",
      title: "친구 집 방문",
      description: "이웃 집을 한 번 구경하세요",
      target: 1,
      progress: 0,
      goldReward: 400,
      gemReward: 4,
      visitFriend: true,
      completed: false,
      claimed: false,
    },
    {
      id: "story-first-room",
      kind: "story",
      title: "첫 번째 꾸미기",
      description: "가구 3개 이상 배치하기",
      target: 3,
      progress: 0,
      goldReward: 1000,
      gemReward: 10,
      upgradeFurniture: true,
      completed: false,
      claimed: false,
    },
    {
      id: "story-buy-item",
      kind: "story",
      title: "상점에서 가구 구매",
      description: "골드로 가구 1개 구매",
      target: 1,
      progress: 0,
      goldReward: 800,
      gemReward: 8,
      completed: false,
      claimed: false,
    },
    {
      id: "story-multi-room",
      kind: "story",
      title: "방 2곳 꾸미기",
      description: "서로 다른 방 2곳에 가구 배치",
      target: 2,
      progress: 0,
      goldReward: 1500,
      gemReward: 15,
      completed: false,
      claimed: false,
    },
  ];
}

export function createDefaultGameState(): AptGameState {
  const now = new Date().toISOString();
  return {
    gold: 5000,
    gems: 50,
    energy: 45,
    maxEnergy: MAX_ENERGY,
    energyUpdatedAt: now,
    ownedStickers: [],
    missions: createDefaultMissions(),
    lastDailyReset: todayKey(),
    overviewSeen: false,
    decoratedRooms: [],
  };
}

export function mergeGameState(raw: unknown): AptGameState {
  const base = createDefaultGameState();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<AptGameState>;
  const today = todayKey();
  let missions = Array.isArray(o.missions) ? (o.missions as AptMissionDef[]) : base.missions;
  const regen = regenEnergy(
    typeof o.energy === "number" ? o.energy : base.energy,
    typeof o.maxEnergy === "number" ? o.maxEnergy : base.maxEnergy,
    typeof o.energyUpdatedAt === "string" ? o.energyUpdatedAt : base.energyUpdatedAt
  );

  if (o.lastDailyReset !== today) {
    missions = missions.map((m) =>
      m.kind === "daily"
        ? {
            ...createDefaultMissions().find((d) => d.id === m.id)!,
            progress: 0,
            completed: false,
            claimed: false,
          }
        : m
    );
    const dailyIds = createDefaultMissions()
      .filter((m) => m.kind === "daily")
      .map((m) => m.id);
    for (const id of dailyIds) {
      if (!missions.some((m) => m.id === id)) {
        missions.push(createDefaultMissions().find((d) => d.id === id)!);
      }
    }
  }

  return {
    gold: typeof o.gold === "number" ? o.gold : base.gold,
    gems: typeof o.gems === "number" ? o.gems : base.gems,
    energy: regen.energy,
    maxEnergy: typeof o.maxEnergy === "number" ? o.maxEnergy : base.maxEnergy,
    energyUpdatedAt: regen.lastTick,
    ownedStickers: Array.isArray(o.ownedStickers) ? o.ownedStickers : base.ownedStickers,
    missions,
    lastDailyReset: today,
    overviewSeen: !!o.overviewSeen,
    decoratedRooms: Array.isArray(o.decoratedRooms) ? (o.decoratedRooms as string[]) : base.decoratedRooms,
  };
}
