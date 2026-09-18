import type { LiveStreamCategory } from "@prisma/client";

/** DB enum stays `LIVE`; display label is R-18 (age-gated). */
export const R18_LIVE_CATEGORY: LiveStreamCategory = "LIVE";

export const R18_LIVE_CATEGORY_BLOCKED_TITLE = "성인 전용";
export const R18_LIVE_CATEGORY_BLOCKED_MSG =
  "프로필에 등록된 생년월일 기준 만 19세 이상만 R-18 카테고리를 이용할 수 있습니다.";

export function isR18LiveCategory(
  cat: LiveStreamCategory | string | null | undefined
): boolean {
  return cat === R18_LIVE_CATEGORY;
}

export const LIVE_CATEGORIES: {
  value: LiveStreamCategory | "ALL";
  label: string;
}[] = [
  { value: "ALL", label: "전체" },
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

export function liveCategoryLabel(cat: LiveStreamCategory | string | null | undefined) {
  const found = LIVE_CATEGORIES.find((c) => c.value === cat);
  return found?.label ?? "라이브";
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
