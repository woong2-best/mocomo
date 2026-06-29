export type AptGameTab = "shop" | "furniture" | "home" | "friends" | "more";

export type AptMissionKind = "daily" | "story";

export type AptMissionDef = {
  id: string;
  kind: AptMissionKind;
  title: string;
  description: string;
  target: number;
  progress: number;
  goldReward: number;
  gemReward: number;
  /** sticker typeId to place, or null */
  placeSticker?: string;
  visitFriend?: boolean;
  upgradeFurniture?: boolean;
  completed: boolean;
  claimed: boolean;
};

export type AptGameState = {
  gold: number;
  gems: number;
  energy: number;
  maxEnergy: number;
  energyUpdatedAt: string;
  /** @deprecated AptInventoryItem — economy.inventory 사용 */
  ownedStickers: string[];
  missions: AptMissionDef[];
  lastDailyReset: string;
  overviewSeen: boolean;
  decoratedRooms: string[];
};

export type AptGameView = "overview" | "room";
