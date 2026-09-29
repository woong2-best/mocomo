import type { CommunityCategory } from "@prisma/client";

/** English tab labels — Korean lives on COMMUNITY_CATEGORY_OPTIONS.label */
export const COMMUNITY_CATEGORY_EN: Record<
  CommunityCategory | "ALL",
  { label: string; shortLabel: string }
> = {
  ALL: { label: "All", shortLabel: "All" },
  FREE: { label: "General", shortLabel: "General" },
  HUMOR: { label: "Humor / trends", shortLabel: "Humor" },
  GAME: { label: "Games", shortLabel: "Games" },
  SPORTS: { label: "Sports", shortLabel: "Sports" },
  CREATOR: { label: "Creators (streamers / VTubers)", shortLabel: "Creators" },
  MUSIC: { label: "Music (Vocaloid / utaite)", shortLabel: "Music" },
  CREATIVE: { label: "Creative / fan art", shortLabel: "Fan art" },
  SUBCULTURE: { label: "Subculture", shortLabel: "Subculture" },
  IT: { label: "Tech / gear", shortLabel: "Tech" },
  FOOD: { label: "Food", shortLabel: "Food" },
  LAW: { label: "Law", shortLabel: "Law" },
  TRAVEL: { label: "Travel", shortLabel: "Travel" },
  POLITICS: { label: "Politics", shortLabel: "Politics" },
  MEDICAL: { label: "Medical", shortLabel: "Medical" },
  INFO: { label: "Info / Q&A", shortLabel: "Q&A" },
  CUSTOM: { label: "Custom", shortLabel: "Custom" },
  // legacy ids (display only)
  ANIME: { label: "Subculture", shortLabel: "Subculture" },
  COMIC: { label: "Subculture", shortLabel: "Subculture" },
  COSPLAY: { label: "Subculture", shortLabel: "Subculture" },
  GOODS: { label: "Subculture", shortLabel: "Subculture" },
  FIGURE: { label: "Subculture", shortLabel: "Subculture" },
  VTUBER: { label: "Creators", shortLabel: "Creators" },
  AI: { label: "Creators", shortLabel: "Creators" },
  UTAITE: { label: "Music", shortLabel: "Music" },
  VOCALOID: { label: "Music", shortLabel: "Music" },
  FANART: { label: "Fan art", shortLabel: "Fan art" },
};
