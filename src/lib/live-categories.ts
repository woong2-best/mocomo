import type { LiveStreamCategory } from "@prisma/client";

export const LIVE_CATEGORIES: {
  value: LiveStreamCategory | "ALL";
  label: string;
}[] = [
  { value: "ALL", label: "전체" },
  { value: "JUST_CHATTING", label: "Chatting" },
  { value: "GAME", label: "게임" },
  { value: "MUSIC", label: "음악" },
  { value: "IRL", label: "IRL" },
  { value: "VIRTUAL", label: "Virtual" },
  { value: "LIVE", label: "LIVE" },
];

/** Folder icon assets (black bg removed) under /public/images/live/categories */
export const LIVE_CATEGORY_ICON: Record<LiveStreamCategory, string> = {
  IRL: "/images/live/categories/irl.png",
  JUST_CHATTING: "/images/live/categories/just_chatting.png",
  GAME: "/images/live/categories/game.png",
  MUSIC: "/images/live/categories/music.png",
  VIRTUAL: "/images/live/categories/virtual.png",
  LIVE: "/images/live/categories/live.png",
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
