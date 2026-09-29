import { uiText } from "@/i18n/ui-text";

/** Mobile live category pills — mirrors web LIVE_CATEGORY_ORDER (FOLLOWING first, R-18 last). */
export const MOBILE_LIVE_CATEGORIES = [
  { id: "ALL", labelKo: "전체", labelEn: "All" },
  { id: "VIRTUAL", labelKo: "Follow", labelEn: "Follow" },
  { id: "GAME", labelKo: "GAMING", labelEn: "GAMING" },
  { id: "JUST_CHATTING", labelKo: "Chat", labelEn: "Chat" },
  { id: "IRL", labelKo: "FESTIVAL", labelEn: "FESTIVAL" },
  { id: "MUSIC", labelKo: "MUSIC", labelEn: "MUSIC" },
  { id: "LIVE", labelKo: "R-18", labelEn: "R-18" },
] as const;

/** DB enum stays `LIVE`; display label is R-18 (age-gated). */
export const R18_LIVE_CATEGORY = "LIVE" as const;

export function r18LiveCategoryBlockedTitle(locale?: string): string {
  return uiText(locale, "성인 전용", "Adults only");
}

export function r18LiveCategoryBlockedMsg(locale?: string): string {
  return uiText(
    locale,
    "프로필에 등록된 생년월일 기준 만 19세 이상만 R-18 카테고리를 이용할 수 있습니다.",
    "You must be 19 or older (based on the birth date on your profile) to use the R-18 category."
  );
}

export function isR18LiveCategory(id: string | null | undefined): boolean {
  return id === R18_LIVE_CATEGORY;
}

export type MobileLiveCategoryId = (typeof MOBILE_LIVE_CATEGORIES)[number]["id"];

export function liveCategoryLabel(id: string | null | undefined, locale?: string): string {
  const found = MOBILE_LIVE_CATEGORIES.find((c) => c.id === id);
  if (found) return uiText(locale, found.labelKo, found.labelEn);
  return uiText(locale, "라이브", "Live");
}

/** Folder PNGs for chrome category rail (labels drawn white on top). */
export const CATEGORY_FOLDER_IMAGE: Record<
  Exclude<MobileLiveCategoryId, "ALL">,
  number
> = {
  VIRTUAL: require("../../../assets/live/categories/virtual-folder.png"),
  GAME: require("../../../assets/live/categories/gaming-folder.png"),
  JUST_CHATTING: require("../../../assets/live/categories/chatting-folder.png"),
  IRL: require("../../../assets/live/categories/irl-folder.png"),
  MUSIC: require("../../../assets/live/categories/music-folder.png"),
  LIVE: require("../../../assets/live/categories/live-folder.png"),
};

export const CATEGORY_POSTER: Record<
  string,
  { colors: [string, string, string]; accent: string }
> = {
  VIRTUAL: {
    colors: ["#C47A8A", "#E0A0B0", "#F0C0C8"],
    accent: "#D48A9A",
  },
  GAME: {
    colors: ["#A8432E", "#C5522A", "#C49A4A"],
    accent: "#C5522A",
  },
  JUST_CHATTING: {
    colors: ["#2A4A7A", "#3A5F96", "#D4A05A"],
    accent: "#3A5F96",
  },
  IRL: {
    colors: ["#2E6B4A", "#3D8A5C", "#C4A35A"],
    accent: "#3D8A5C",
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

export function formatViewerCount(n: number, locale?: string): string {
  const count = coerceViewerCount(n);
  if (count >= 10000) {
    const man = count / 10000;
    const num = man >= 10 ? Math.round(man) : man.toFixed(1).replace(/\.0$/, "");
    return uiText(locale, `${num}만명 시청 중`, `${num}0K watching`);
  }
  if (count >= 1000) {
    const num = (count / 1000).toFixed(1).replace(/\.0$/, "");
    return uiText(locale, `${num}천명 시청 중`, `${num}K watching`);
  }
  return uiText(locale, `${count}명 시청 중`, `${count} watching`);
}

/** Compact badge — e.g. 9,750 or 1.2K style */
export function formatViewerCountCompact(n: number, locale?: string): string {
  const count = coerceViewerCount(n);
  if (count >= 10000) {
    const man = count / 10000;
    const num = man >= 10 ? Math.round(man) : man.toFixed(1).replace(/\.0$/, "");
    return uiText(locale, `${num}만`, `${num}0K`);
  }
  if (count >= 1000) {
    const num = (count / 1000).toFixed(1).replace(/\.0$/, "");
    return uiText(locale, `${num}천`, `${num}K`);
  }
  return count.toLocaleString(locale === "ko" ? "ko-KR" : "en-US");
}

export function providerLabel(provider: string, locale?: string): string {
  const p = provider.toUpperCase();
  if (p === "YOUTUBE") return "YouTube";
  if (p === "TWITCH") return "Twitch";
  if (p === "CHZZK") return uiText(locale, "치지직", "CHZZK");
  return provider;
}
