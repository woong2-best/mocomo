import type { LiveStreamCategory } from "@prisma/client";

export const LIVE_CATEGORIES: {
  value: LiveStreamCategory | "ALL";
  label: string;
}[] = [
  { value: "ALL", label: "전체" },
  { value: "JUST_CHATTING", label: "CHATTING" },
  { value: "GAME", label: "GAMING" },
  { value: "MUSIC", label: "MUSIC" },
  { value: "IRL", label: "IRL" },
  { value: "VIRTUAL", label: "VIRTUAL" },
  { value: "LIVE", label: "LIVE" },
];

/** Transparent folder icons (black bg removed) — labels rendered in CSS */
export const LIVE_CATEGORY_ICON: Record<LiveStreamCategory, string> = {
  IRL: "/images/live/categories/irl-folder.png",
  JUST_CHATTING: "/images/live/categories/chatting-folder.png",
  GAME: "/images/live/categories/gaming-folder.png",
  MUSIC: "/images/live/categories/music-folder.png",
  VIRTUAL: "/images/live/categories/virtual-folder.png",
  LIVE: "/images/live/categories/live-folder.png",
};

export const LIVE_CATEGORY_ORDER: LiveStreamCategory[] = [
  "IRL",
  "JUST_CHATTING",
  "GAME",
  "MUSIC",
  "VIRTUAL",
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
