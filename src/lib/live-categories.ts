import type { LiveStreamCategory } from "@prisma/client";
import type { Locale } from "@/lib/i18n/config";
import { translate } from "@/lib/i18n/messages";
import type { MessageKey } from "@/lib/i18n/message-keys";

/** DB enum stays `LIVE`; display label is R-18 (age-gated). */
export const R18_LIVE_CATEGORY: LiveStreamCategory = "LIVE";

export const R18_LIVE_CATEGORY_BLOCKED_TITLE = "Adults only";
export const R18_LIVE_CATEGORY_BLOCKED_MSG =
  "Only users aged 19+ by the birth date on their profile can use R-18 categories.";

export function isR18LiveCategory(
  cat: LiveStreamCategory | string | null | undefined
): boolean {
  return cat === R18_LIVE_CATEGORY;
}

export const LIVE_CATEGORIES: {
  value: LiveStreamCategory | "ALL";
  label: string;
}[] = [
  { value: "ALL", label: "All" },
  { value: "JUST_CHATTING", label: "CHATTING" },
  { value: "GAME", label: "GAMING" },
  { value: "MUSIC", label: "MUSIC" },
  { value: "IRL", label: "FESTIVAL" },
  { value: "VIRTUAL", label: "FOLLOWING" },
  { value: "LIVE", label: "R-18" },
];

/** Transparent full-folder icons (black bg removed only). Labels drawn on folder in UI. */
export const LIVE_CATEGORY_ICON: Record<LiveStreamCategory, string> = {
  IRL: "/images/live/categories/irl-folder.png?v=3",
  JUST_CHATTING: "/images/live/categories/chatting-folder.png?v=3",
  GAME: "/images/live/categories/gaming-folder.png?v=3",
  MUSIC: "/images/live/categories/music-folder.png?v=3",
  VIRTUAL: "/images/live/categories/virtual-folder.png?v=3",
  LIVE: "/images/live/categories/live-folder.png?v=3",
};

/** Half-cut folder tabs (black bg removed) — sit flush on matching SMPTE columns. */
export const LIVE_CATEGORY_TAB: Record<LiveStreamCategory, string> = {
  VIRTUAL: "/images/live/categories/virtual-tab.png?v=2",
  GAME: "/images/live/categories/gaming-tab.png?v=2",
  JUST_CHATTING: "/images/live/categories/chatting-tab.png?v=2",
  IRL: "/images/live/categories/irl-tab.png?v=2",
  MUSIC: "/images/live/categories/music-tab.png?v=2",
  LIVE: "/images/live/categories/live-tab.png?v=2",
};

/** SMPTE empty-TV bars L→R (6 categories + teal filler). */
export const LIVE_SMPTE_COLORS = [
  "#e090b0", // FOLLOWING
  "#e08020", // GAMING
  "#0000c0", // CHATTING
  "#00c000", // FESTIVAL
  "#c000c0", // MUSIC
  "#c00000", // R-18
  "#00c0c0", // filler
] as const;

/** Mockup L→R: pink FOLLOWING · brown GAMING · blue CHATTING · green FESTIVAL · purple MUSIC · red R-18 */
export const LIVE_CATEGORY_ORDER: LiveStreamCategory[] = [
  "VIRTUAL",
  "GAME",
  "JUST_CHATTING",
  "IRL",
  "MUSIC",
  "LIVE",
];

/** Go-live / studio pickers — FOLLOWING(VIRTUAL) is a hub filter, not a stream category. */
export const BROADCAST_PICK_CATEGORIES = LIVE_CATEGORIES.filter(
  (c): c is { value: LiveStreamCategory; label: string } =>
    c.value !== "ALL" && c.value !== "VIRTUAL"
);

export function isBroadcastPickCategory(
  cat: LiveStreamCategory | string | null | undefined
): cat is LiveStreamCategory {
  return BROADCAST_PICK_CATEGORIES.some((c) => c.value === cat);
}

const CATEGORY_LABEL_KEYS: Partial<Record<LiveStreamCategory | "ALL", MessageKey>> = {
  ALL: "live.category.all",
  JUST_CHATTING: "live.category.chatting",
  GAME: "live.category.gaming",
  MUSIC: "live.category.music",
  IRL: "live.category.festival",
  LIVE: "live.category.r18",
  VIRTUAL: "live.category.all",
};

export function liveCategoryLabel(
  cat: LiveStreamCategory | string | null | undefined,
  locale: Locale = "en"
) {
  const key =
    cat != null && cat in CATEGORY_LABEL_KEYS
      ? CATEGORY_LABEL_KEYS[cat as LiveStreamCategory | "ALL"]
      : undefined;
  if (key) return translate(locale, key);
  return translate(locale, "live.studio.tag");
}

export function parseLiveCategoryParam(raw?: string | null): LiveStreamCategory | undefined {
  if (!raw || raw === "ALL") return undefined;
  const allowed = ["LIVE", "JUST_CHATTING", "GAME", "MUSIC", "IRL", "VIRTUAL"] as const;
  return allowed.includes(raw as (typeof allowed)[number])
    ? (raw as LiveStreamCategory)
    : undefined;
}

export function parseLiveTagsInput(raw: string): string[] {
  return raw
    .split(/[,#\s]+/)
    .map((t) => t.trim().replace(/^#/, ""))
    .filter((t) => t.length >= 2 && t.length <= 24)
    .slice(0, 8);
}
