import type { LiveStreamCategory } from "@prisma/client";
import type { Locale } from "@/lib/i18n/config";
import { LIVE_CATEGORIES } from "@/lib/live-categories";

const CATEGORY_LABELS: Record<Locale, Record<string, string>> = {
  ko: {
    ALL: "전체",
    JUST_CHATTING: "Just Chatting",
    GAME: "게임",
    MUSIC: "음악",
    IRL: "IRL",
    LIVE: "LIVE",
    default: "라이브",
  },
  en: {
    ALL: "All",
    JUST_CHATTING: "Just Chatting",
    GAME: "Gaming",
    MUSIC: "Music",
    IRL: "IRL",
    LIVE: "LIVE",
    default: "Live",
  },
  ja: {
    ALL: "すべて",
    JUST_CHATTING: "Just Chatting",
    GAME: "ゲーム",
    MUSIC: "音楽",
    IRL: "IRL",
    LIVE: "LIVE",
    default: "ライブ",
  },
  zh: {
    ALL: "全部",
    JUST_CHATTING: "Just Chatting",
    GAME: "游戏",
    MUSIC: "音乐",
    IRL: "IRL",
    LIVE: "LIVE",
    default: "直播",
  },
};

export function getLocalizedLiveCategories(locale: Locale) {
  const labels = CATEGORY_LABELS[locale] ?? CATEGORY_LABELS.en;
  return LIVE_CATEGORIES.map((c) => ({
    ...c,
    label: labels[c.value] ?? c.label,
  }));
}

export function localizedLiveCategoryLabel(
  cat: LiveStreamCategory | string | null | undefined,
  locale: Locale
): string {
  const labels = CATEGORY_LABELS[locale] ?? CATEGORY_LABELS.en;
  if (!cat) return labels.default;
  return labels[cat] ?? labels.default;
}
