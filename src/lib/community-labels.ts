import type { CommunityCategory } from "@prisma/client";
import { QNA_MY_CATEGORY_ID, type QnaMyCategoryId } from "@/lib/qna-my-category";
import { QNA_NSFW_CATEGORY_ID, type QnaNsfwCategoryId } from "@/lib/qna-nsfw-category";
import type { Locale } from "@/lib/i18n/config";
import { COMMUNITY_CATEGORY_EN } from "@/lib/community-labels-i18n";
import { createTranslator } from "@/lib/i18n/messages";

const t = createTranslator("en");

export { QNA_MY_CATEGORY_ID, type QnaMyCategoryId, QNA_NSFW_CATEGORY_ID, type QnaNsfwCategoryId };

const CATEGORY_EMOJI: Record<CommunityCategory, string> = {
  FREE: "💬",
  HUMOR: "😂",
  GAME: "🎮",
  SPORTS: "⚽",
  CREATOR: "📡",
  MUSIC: "🎵",
  CREATIVE: "🎨",
  SUBCULTURE: "✨",
  IT: "💻",
  FOOD: "🍜",
  LAW: "⚖️",
  TRAVEL: "✈️",
  POLITICS: "🏛️",
  MEDICAL: "🏥",
  INFO: "❓",
  CUSTOM: "➕",
  ANIME: "✨",
  COMIC: "✨",
  COSPLAY: "✨",
  GOODS: "✨",
  FIGURE: "✨",
  VTUBER: "📡",
  AI: "📡",
  UTAITE: "🎵",
  VOCALOID: "🎵",
  FANART: "🎨",
};

const MAIN_COMMUNITY_CATEGORIES: CommunityCategory[] = [
  "FREE",
  "HUMOR",
  "GAME",
  "SPORTS",
  "CREATOR",
  "MUSIC",
  "CREATIVE",
  "SUBCULTURE",
  "IT",
  "FOOD",
  "LAW",
  "TRAVEL",
  "POLITICS",
  "MEDICAL",
  "INFO",
];

export const COMMUNITY_CATEGORY_OPTIONS: {
  id: CommunityCategory;
  label: string;
  emoji: string;
  shortLabel: string;
}[] = MAIN_COMMUNITY_CATEGORIES.map((id) => {
  const en = COMMUNITY_CATEGORY_EN[id];
  return {
    id,
    label: en.label,
    shortLabel: en.shortLabel,
    emoji: CATEGORY_EMOJI[id],
  };
});

/** QnA feed horizontal tabs — preset categories + NSFW (age-gated in UI). */
export const QNA_FEED_CATEGORY_TABS = [
  { id: "ALL" as const, label: "All", shortLabel: "All", emoji: "" },
  ...COMMUNITY_CATEGORY_OPTIONS,
  { id: QNA_NSFW_CATEGORY_ID, label: "NSFW", shortLabel: "NSFW", emoji: "🔞" },
  { id: QNA_MY_CATEGORY_ID, label: "My", shortLabel: "My", emoji: "👤" },
];

export type QnaFeedTabId =
  | "ALL"
  | CommunityCategory
  | typeof QNA_NSFW_CATEGORY_ID
  | typeof QNA_MY_CATEGORY_ID;

export type QnaCreateCategorySelection = CommunityCategory | typeof QNA_NSFW_CATEGORY_ID;

export function qnaCreateSelectionToApi(selection: QnaCreateCategorySelection): {
  category: CommunityCategory;
  customCategoryLabel?: string;
  isNsfw: boolean;
} {
  if (selection === QNA_NSFW_CATEGORY_ID) {
    return { category: "CUSTOM", customCategoryLabel: "NSFW", isNsfw: true };
  }
  return { category: selection, isNsfw: false };
}

/** Legacy taxonomy → v3 mapping (pre-migration display). */
const LEGACY_COMMUNITY_CATEGORY_MAP: Partial<Record<CommunityCategory, CommunityCategory>> = {
  ANIME: "SUBCULTURE",
  COMIC: "SUBCULTURE",
  COSPLAY: "SUBCULTURE",
  GOODS: "SUBCULTURE",
  FIGURE: "SUBCULTURE",
  VTUBER: "CREATOR",
  AI: "CREATOR",
  UTAITE: "MUSIC",
  VOCALOID: "MUSIC",
  FANART: "CREATIVE",
};

export const COMMUNITY_CATEGORY_IDS: readonly CommunityCategory[] = [
  ...COMMUNITY_CATEGORY_OPTIONS.map((c) => c.id),
  "CUSTOM",
  ...(Object.keys(LEGACY_COMMUNITY_CATEGORY_MAP) as CommunityCategory[]),
];

export function isCommunityCategory(value: string): value is CommunityCategory {
  return (COMMUNITY_CATEGORY_IDS as readonly string[]).includes(value);
}

export function normalizeCommunityCategory(value: string): CommunityCategory | null {
  if (isCommunityCategory(value)) {
    return LEGACY_COMMUNITY_CATEGORY_MAP[value] ?? value;
  }
  return null;
}

export function communityCategoryLabel(
  category: string,
  customCategoryLabel?: string | null,
  _locale: Locale | string = "en"
): string {
  return resolveCommunityCategoryDisplay(category, customCategoryLabel, _locale).label;
}

export function communityCategoryMeta(category: string) {
  const normalized = normalizeCommunityCategory(category) ?? category;
  return COMMUNITY_CATEGORY_OPTIONS.find((c) => c.id === normalized) ?? null;
}

export function resolveCommunityCategoryDisplay(
  category: string,
  customCategoryLabel?: string | null,
  _locale: Locale | string = "en"
): { label: string; shortLabel: string; emoji: string } {
  if (category === "CUSTOM") {
    const label = customCategoryLabel?.trim() || t("auth.emailCustom");
    return { label, shortLabel: label, emoji: "➕" };
  }
  const meta = communityCategoryMeta(category);
  if (meta) {
    const normalized = normalizeCommunityCategory(category) ?? category;
    const en =
      COMMUNITY_CATEGORY_EN[normalized as keyof typeof COMMUNITY_CATEGORY_EN] ??
      COMMUNITY_CATEGORY_EN[meta.id];
    return { label: en.label, shortLabel: en.shortLabel, emoji: meta.emoji };
  }
  return { label: category, shortLabel: category, emoji: "🏷️" };
}

export function communityCategoryTabLabel(
  category: string,
  customCategoryLabel?: string | null,
  locale: Locale | string = "en"
): string {
  const display = resolveCommunityCategoryDisplay(category, customCategoryLabel, locale);
  return `${display.emoji} ${display.shortLabel}`;
}

export function validateCustomCategoryLabel(
  label: string | undefined | null,
  _locale: Locale | string = "en"
): string | null {
  const trimmed = label?.trim();
  if (!trimmed) return t("ui.enter_a_category_name");
  if (trimmed.length < 2) {
    return t("ui.category_name_must_be_at_least");
  }
  if (trimmed.length > 24) {
    return t("ui.category_name_must_be_24_characters");
  }
  return null;
}

/** QnA feed tab label (ALL preset) */
export function qnaFeedTabDisplay(
  tabId: string,
  _locale: Locale | string = "en"
): { label: string; shortLabel: string; emoji: string } {
  if (tabId === "ALL") {
    const en = COMMUNITY_CATEGORY_EN.ALL;
    return { label: en.label, shortLabel: en.shortLabel, emoji: "" };
  }
  if (tabId === QNA_NSFW_CATEGORY_ID) {
    return { label: "NSFW", shortLabel: "NSFW", emoji: "🔞" };
  }
  if (tabId === QNA_MY_CATEGORY_ID) {
    return { label: "My", shortLabel: "My", emoji: "👤" };
  }
  return resolveCommunityCategoryDisplay(tabId, null, _locale);
}
