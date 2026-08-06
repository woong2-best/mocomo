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

export function formatViewerCount(n: number): string {
  if (n >= 10000) {
    const man = n / 10000;
    return `${man >= 10 ? Math.round(man) : man.toFixed(1).replace(/\.0$/, "")}만명 시청 중`;
  }
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}천명 시청 중`;
  }
  return `${n}명 시청 중`;
}

export function providerLabel(provider: string): string {
  const p = provider.toUpperCase();
  if (p === "YOUTUBE") return "YouTube";
  if (p === "TWITCH") return "Twitch";
  if (p === "CHZZK") return "치지직";
  return provider;
}
