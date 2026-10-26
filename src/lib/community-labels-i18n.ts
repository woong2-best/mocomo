import type { CommunityCategory } from "@prisma/client";

/** English tab labels — Korean lives on COMMUNITY_CATEGORY_OPTIONS.label */
export const COMMUNITY_CATEGORY_EN: Record<
  CommunityCategory | "ALL",
  { label: string; shortLabel: string }
> = {
  ALL: { label: "All", shortLabel: "All" },
  FREE: { label: "General", shortLabel: "General" },
  ANIME: { label: "Anime", shortLabel: "Anime" },
  GAME: { label: "Games", shortLabel: "Games" },
  GOODS: { label: "Goods", shortLabel: "Goods" },
  CREATOR: { label: "Creators (streamers)", shortLabel: "Creators" },
  MUSIC: { label: "Music (Vocaloid / utaite)", shortLabel: "Music" },
  CREATIVE: { label: "Creative / fan art", shortLabel: "Fan art" },
  VTUBER: { label: "VTuber", shortLabel: "VTuber" },
  IT: { label: "Tech / gear", shortLabel: "Tech" },
  FOOD: { label: "Food", shortLabel: "Food" },
  LAW: { label: "Law", shortLabel: "Law" },
  TRAVEL: { label: "Festival / events", shortLabel: "Festival" },
  POLITICS: { label: "Politics", shortLabel: "Politics" },
  COSPLAY: { label: "Cosplay", shortLabel: "Cosplay" },
  INFO: { label: "Info / Q&A", shortLabel: "Q&A" },
  CUSTOM: { label: "Custom", shortLabel: "Custom" },
  // retired tab ids (display via normalizeCommunityCategory)
  HUMOR: { label: "Anime", shortLabel: "Anime" },
  SPORTS: { label: "Goods", shortLabel: "Goods" },
  SUBCULTURE: { label: "VTuber", shortLabel: "VTuber" },
  MEDICAL: { label: "Cosplay", shortLabel: "Cosplay" },
  COMIC: { label: "Anime", shortLabel: "Anime" },
  FIGURE: { label: "Goods", shortLabel: "Goods" },
  AI: { label: "Creators", shortLabel: "Creators" },
  UTAITE: { label: "Music", shortLabel: "Music" },
  VOCALOID: { label: "Music", shortLabel: "Music" },
  FANART: { label: "Fan art", shortLabel: "Fan art" },
};
