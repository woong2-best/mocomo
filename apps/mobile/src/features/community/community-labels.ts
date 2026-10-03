import { translate } from "@/i18n/runtime";

/** Matches web `src/lib/community-labels.ts` */
const CATEGORY_META = [
  { id: "ALL", emoji: "" },
  { id: "FREE", emoji: "💬" },
  { id: "HUMOR", emoji: "😂" },
  { id: "GAME", emoji: "🎮" },
  { id: "SPORTS", emoji: "⚽" },
  { id: "CREATOR", emoji: "📡" },
  { id: "MUSIC", emoji: "🎵" },
  { id: "CREATIVE", emoji: "🎨" },
  { id: "SUBCULTURE", emoji: "✨" },
  { id: "IT", emoji: "💻" },
  { id: "FOOD", emoji: "🍜" },
  { id: "LAW", emoji: "⚖️" },
  { id: "TRAVEL", emoji: "✈️" },
  { id: "POLITICS", emoji: "🏛️" },
  { id: "MEDICAL", emoji: "🏥" },
  { id: "INFO", emoji: "❓" },
] as const;

function categoryKeys(id: string): { labelKey: string; shortLabelKey: string } {
  const slug = id.toLowerCase();
  return {
    labelKey: `m.community.category.${slug}.label`,
    shortLabelKey: `m.community.category.${slug}.short`,
  };
}

export const COMMUNITY_CATEGORY_OPTIONS = CATEGORY_META.map((row) => {
  const keys = categoryKeys(row.id);
  return {
    ...row,
    ...keys,
    get label() {
      return translate(keys.labelKey);
    },
    get shortLabel() {
      return translate(keys.shortLabelKey);
    },
  };
});

/** QnA list tabs — includes NSFW (age-gated) and My (own questions only). */
export const QNA_MY_CATEGORY_ID = "MY" as const;

export const QNA_FEED_CATEGORY_TABS = [
  ...COMMUNITY_CATEGORY_OPTIONS,
  { id: "NSFW" as const, shortLabel: "NSFW", emoji: "🔞", label: "NSFW", labelKey: "NSFW", shortLabelKey: "NSFW" },
  { id: QNA_MY_CATEGORY_ID, shortLabel: "My", emoji: "👤", label: "My", labelKey: "MY", shortLabelKey: "MY" },
] as const;

export type QnaFeedTabId = (typeof QNA_FEED_CATEGORY_TABS)[number]["id"];

export type CommunityCategoryId = Exclude<
  (typeof COMMUNITY_CATEGORY_OPTIONS)[number]["id"],
  "ALL"
>;

/** QnA create grid — NSFW is one category chip (mutually exclusive with the rest). */
export const QNA_NSFW_CATEGORY_ID = "NSFW" as const;

export type QnaCreateCategorySelection = CommunityCategoryId | typeof QNA_NSFW_CATEGORY_ID;

export function qnaCreateSelectionToApi(selection: QnaCreateCategorySelection): {
  category: string;
  customCategoryLabel?: string;
  isNsfw: boolean;
} {
  if (selection === QNA_NSFW_CATEGORY_ID) {
    return { category: "CUSTOM", customCategoryLabel: "NSFW", isNsfw: true };
  }
  return { category: selection, isNsfw: false };
}

const LEGACY_COMMUNITY_CATEGORY_MAP: Partial<Record<string, CommunityCategoryId>> = {
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

export function communityCategoryMeta(category: string) {
  const normalized =
    category === "ALL"
      ? "ALL"
      : ((LEGACY_COMMUNITY_CATEGORY_MAP[category] ?? category) as CommunityCategoryId | "ALL");
  return COMMUNITY_CATEGORY_OPTIONS.find((c) => c.id === normalized && c.id !== "ALL") ?? null;
}

export function galleryAuthorLabel(
  name: string | null | undefined,
  username: string,
  isAnonymous = false
): string {
  if (isAnonymous || username === "anonymous") return "Q";
  const nick = name?.trim() || username;
  return `${nick} (${username})`;
}

export const COMMUNITY_CONCEPT_LIKE_MIN = 10;

export function resolveCommunityCategoryDisplay(
  category: string,
  customCategoryLabel?: string | null,
  _locale = "en"
) {
  if (category === "CUSTOM") {
    const label = customCategoryLabel?.trim() || translate("m.common.custom");
    return { label, shortLabel: label, emoji: "➕" };
  }
  if (category === "ALL") {
    return {
      label: translate("m.community.category.all.label"),
      shortLabel: translate("m.community.category.all.short"),
      emoji: "",
    };
  }
  const meta = communityCategoryMeta(category);
  if (meta) {
    return { label: meta.label, shortLabel: meta.shortLabel, emoji: meta.emoji };
  }
  return { label: category, shortLabel: category, emoji: "🏷️" };
}

/** Tab chip labels for QnA feed / create grids. */
export function localizedCategoryTab<T extends { id: string; shortLabel: string; label: string }>(
  opt: T,
  _locale: string
): T {
  return opt;
}

export function validateCustomCategoryLabel(
  label: string | undefined | null,
  _locale = "en"
): string | null {
  const trimmed = label?.trim();
  if (!trimmed) return translate("m.community.enter_a_category_name");
  if (trimmed.length < 2) {
    return translate("m.community.at_least_2_characters");
  }
  if (trimmed.length > 24) {
    return translate("m.community.24_characters_or_fewer");
  }
  return null;
}
