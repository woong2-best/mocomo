import type { MobileLiveCategoryId } from "@/features/live/live-categories";

/** Web `/live` folder-rack PNGs — labels baked into art, no overlay text. */
export const LIVE_FOLDER_RACK_HOLDER = require("../../../assets/live/folder-rack/holder.png");

export type LiveRackFolderDef = {
  categoryId: Exclude<MobileLiveCategoryId, "ALL">;
  a11yLabel: string;
  src: number;
  /** Slot opening on holder.png, percent of tray height */
  topPct: number;
  heightPct: number;
};

export const LIVE_FOLDER_RACK_SLOTS: LiveRackFolderDef[] = [
  {
    categoryId: "VIRTUAL",
    a11yLabel: "FOLLOW",
    src: require("../../../assets/live/folder-rack/folder-following.png"),
    topPct: 17.4,
    heightPct: 9.6,
  },
  {
    categoryId: "GAME",
    a11yLabel: "GAME",
    src: require("../../../assets/live/folder-rack/folder-gaming.png"),
    topPct: 30.1,
    heightPct: 9.6,
  },
  {
    categoryId: "JUST_CHATTING",
    a11yLabel: "CHAT",
    src: require("../../../assets/live/folder-rack/folder-chatting.png"),
    topPct: 42.8,
    heightPct: 9.6,
  },
  {
    categoryId: "IRL",
    a11yLabel: "FESTIVAL",
    src: require("../../../assets/live/folder-rack/folder-festival.png"),
    topPct: 55.5,
    heightPct: 9.6,
  },
  {
    categoryId: "MUSIC",
    a11yLabel: "MUSIC",
    src: require("../../../assets/live/folder-rack/folder-music.png"),
    topPct: 68.2,
    heightPct: 9.6,
  },
  {
    categoryId: "LIVE",
    a11yLabel: "R-18",
    src: require("../../../assets/live/folder-rack/folder-r18.png"),
    topPct: 80.9,
    heightPct: 9.6,
  },
];
