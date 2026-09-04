/** Matches web `src/lib/community-labels.ts` */
export const COMMUNITY_CATEGORY_OPTIONS = [
  { id: "ALL", shortLabel: "전체", emoji: "", label: "전체" },
  { id: "FREE", shortLabel: "자유", emoji: "💬", label: "자유" },
  { id: "HUMOR", shortLabel: "유머·이슈", emoji: "😂", label: "유머 / 이슈" },
  { id: "GAME", shortLabel: "게임", emoji: "🎮", label: "게임" },
  { id: "SPORTS", shortLabel: "스포츠", emoji: "⚽", label: "스포츠" },
  { id: "CREATOR", shortLabel: "크리에이터", emoji: "📡", label: "크리에이터 (스트리머 / 버튜버)" },
  { id: "MUSIC", shortLabel: "음악", emoji: "🎵", label: "음악 (보카로 / 우타이테)" },
  { id: "CREATIVE", shortLabel: "창작·팬아트", emoji: "🎨", label: "창작 / 팬아트" },
  { id: "SUBCULTURE", shortLabel: "서브컬쳐", emoji: "✨", label: "서브컬쳐" },
  { id: "IT", shortLabel: "IT·장비", emoji: "💻", label: "IT / 장비" },
  { id: "FOOD", shortLabel: "음식·맛집", emoji: "🍜", label: "음식 / 맛집" },
  { id: "INFO", shortLabel: "정보·질문", emoji: "❓", label: "정보 / 질문" },
] as const;

export type CommunityCategoryId = Exclude<(typeof COMMUNITY_CATEGORY_OPTIONS)[number]["id"], "ALL">;

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

export function resolveCommunityCategoryDisplay(
  category: string,
  customCategoryLabel?: string | null
) {
  if (category === "CUSTOM") {
    const label = customCategoryLabel?.trim() || "직접 입력";
    return { label, shortLabel: label, emoji: "➕" };
  }
  const meta = communityCategoryMeta(category);
  if (meta) {
    return { label: meta.label, shortLabel: meta.shortLabel, emoji: meta.emoji };
  }
  return { label: category, shortLabel: category, emoji: "🏷️" };
}

export function validateCustomCategoryLabel(label: string | undefined | null): string | null {
  const trimmed = label?.trim();
  if (!trimmed) return "카테고리 이름을 입력해 주세요.";
  if (trimmed.length < 2) return "카테고리 이름은 2자 이상 입력해 주세요.";
  if (trimmed.length > 24) return "카테고리 이름은 24자 이하로 입력해 주세요.";
  return null;
}
