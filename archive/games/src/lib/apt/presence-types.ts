import {
  DEFAULT_BONDEE_ROOM,
  DEFAULT_CHIBI_AVATAR,
  type BondeeHomeState,
  type BondeeFurnitureKind,
  type ChibiAvatarConfig,
} from "@/lib/apt/bondee/types";
import type { HomeIdentitySummary } from "@/lib/apt/home-identity";

const INSTRUMENT_KINDS = new Set<BondeeFurnitureKind>([
  "gramophone",
  "acoustic_guitar",
  "electric_guitar",
  "bass_guitar",
  "violin",
  "cello",
  "harp",
  "piano",
  "upright_piano",
  "grand_piano",
  "synthesizer",
  "marimba",
  "drum_set",
  "timpani",
  "xylophone",
  "accordion",
  "pan_flute",
  "ocarina",
  "saxophone",
  "trumpet",
  "french_horn",
]);

export type HomeActivityState = {
  doorOpen: boolean;
  lightsOn: boolean;
  tvOn: boolean;
  musicPlaying: boolean;
  streaming: boolean;
  hasGuest: boolean;
};

export type AptPresenceOccupant = {
  userId: string;
  username: string;
  displayName: string;
  homeFloor: number;
  doorOpen: boolean;
  avatar: ChibiAvatarConfig;
  activity: HomeActivityState;
  isOnline: boolean;
  aptMode: string | null;
  visitingUserId: string | null;
  visitorCountToday: number;
  visitCountToday: number;
  identity: HomeIdentitySummary;
};

export type AptCommunityRankEntry = {
  userId: string;
  displayName: string;
  homeFloor: number;
  score: number;
};

export type AptRecentVisitorEntry = {
  userId: string;
  displayName: string;
  agoLabel: string;
};

export type AptPlazaPerformer = {
  userId: string;
  displayName: string;
  homeFloor: number;
  avatar: ChibiAvatarConfig;
  kind: "stream" | "music";
};

import type { AptDailyLoop } from "@/lib/apt/apt-daily-loop";

export type { AptDailyLoop };

export type AptCommunityFeed = {
  occupants: AptPresenceOccupant[];
  recentVisitorsToHome: AptRecentVisitorEntry[];
  guestbookNames: string[];
  popularHome: AptCommunityRankEntry | null;
  visitorRanking: AptCommunityRankEntry[];
  mostVisitedToday: AptCommunityRankEntry | null;
  mostActiveFloor: { floor: number; onlineCount: number } | null;
  plazaPerformers: AptPlazaPerformer[];
  elevatorBusy: boolean;
  mailboxUnread: number;
  daily: AptDailyLoop;
};

export function parseBondeeFromSim(raw: unknown): BondeeHomeState {
  if (!raw || typeof raw !== "object") return DEFAULT_BONDEE_ROOM;
  const sim = raw as Record<string, unknown>;
  const b = sim.bondee;
  if (b && typeof b === "object" && "items" in (b as object)) {
    const room = b as BondeeHomeState;
    return {
      ...DEFAULT_BONDEE_ROOM,
      ...room,
      avatar: room.avatar ?? DEFAULT_CHIBI_AVATAR,
      items: room.items ?? [],
    };
  }
  return DEFAULT_BONDEE_ROOM;
}

export function deriveHomeActivity(
  bondee: BondeeHomeState,
  doorOpen: boolean,
  streaming: boolean,
  guestCount: number
): HomeActivityState {
  const lampOn = bondee.items.some((item) => {
    if (item.kind !== "floor_lamp" && item.kind !== "desk") return false;
    return bondee.lightsOn?.[item.id] !== false;
  });
  const anyLight = Boolean(
    lampOn ||
      Object.values(bondee.lightsOn ?? {}).some(Boolean) ||
      (bondee.acOn && Object.values(bondee.acOn).some(Boolean))
  );
  const hasTv = bondee.items.some((i) => i.kind === "tv_stand" || i.kind === "monitor");
  const tvOn = doorOpen && hasTv && (anyLight || bondee.activeRoomId === "living");
  const musicPlaying =
    doorOpen &&
    bondee.items.some((i) => INSTRUMENT_KINDS.has(i.kind)) &&
    (anyLight || bondee.pose === "sit" || bondee.pose === "stand");

  return {
    doorOpen,
    lightsOn: doorOpen && anyLight,
    tvOn,
    musicPlaying,
    streaming: streaming && doorOpen,
    hasGuest: guestCount > 0,
  };
}

export function formatAgoLabel(at: Date, now = Date.now()): string {
  const diff = now - at.getTime();
  if (diff < 60_000) return "방금";
  if (diff < 360_000) return `${Math.floor(diff / 60_000)}분 전`;
  if (diff < 86_400_000) return `${Math.floor(diff / 360_000)}시간 전`;
  return "어제";
}
