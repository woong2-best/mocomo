/** Mobile live category pills — mirrors web LIVE_CATEGORIES. */
export const MOBILE_LIVE_CATEGORIES = [
  { id: "ALL", label: "전체" },
  { id: "JUST_CHATTING", label: "Just Chatting" },
  { id: "GAME", label: "게임" },
  { id: "MUSIC", label: "음악" },
  { id: "IRL", label: "IRL" },
  { id: "LIVE", label: "LIVE" },
] as const;

export type MobileLiveCategoryId = (typeof MOBILE_LIVE_CATEGORIES)[number]["id"];

export function liveCategoryLabel(id: string | null | undefined): string {
  const found = MOBILE_LIVE_CATEGORIES.find((c) => c.id === id);
  return found?.label ?? "라이브";
}

export const CATEGORY_POSTER: Record<
  string,
  { colors: [string, string, string]; accent: string }
> = {
  IRL: {
    colors: ["#2E6B4A", "#3D8A5C", "#C4A35A"],
    accent: "#3D8A5C",
  },
  JUST_CHATTING: {
    colors: ["#2A4A7A", "#3A5F96", "#D4A05A"],
    accent: "#3A5F96",
  },
  GAME: {
    colors: ["#A8432E", "#C5522A", "#C49A4A"],
    accent: "#C5522A",
  },
  MUSIC: {
    colors: ["#5A3A6E", "#6E4A7A", "#D4A05A"],
    accent: "#6E4A7A",
  },
  LIVE: {
    colors: ["#7A2A3A", "#C5522A", "#B87A4A"],
    accent: "#C5522A",
  },
};

export function coerceViewerCount(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v) || v < 0) return 0;
  return Math.floor(v);
}

export function formatViewerCount(n: number): string {
  const count = coerceViewerCount(n);
  if (count >= 10000) {
    const man = count / 10000;
    return `${man >= 10 ? Math.round(man) : man.toFixed(1).replace(/\.0$/, "")}만명 시청 중`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}천명 시청 중`;
  }
  return `${count}명 시청 중`;
}

/** Compact badge — e.g. "9,750명", "1.2만" */
export function formatViewerCountCompact(n: number): string {
  const count = coerceViewerCount(n);
  if (count >= 10000) {
    const man = count / 10000;
    return `${man >= 10 ? Math.round(man) : man.toFixed(1).replace(/\.0$/, "")}만`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}천`;
  }
  return count.toLocaleString("ko-KR");
}

export function providerLabel(provider: string): string {
  const p = provider.toUpperCase();
  if (p === "YOUTUBE") return "YouTube";
  if (p === "TWITCH") return "Twitch";
  if (p === "CHZZK") return "치지직";
  return provider;
}
