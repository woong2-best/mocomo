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
  ownedStickers: string[];
  missions: AptMissionDef[];
  lastDailyReset: string;
  overviewSeen: boolean;
};

export type AptGameView = "overview" | "room";
