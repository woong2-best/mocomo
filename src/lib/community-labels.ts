import type { CommunityCategory } from "@prisma/client";

export const COMMUNITY_CATEGORY_OPTIONS: {
  id: CommunityCategory;
  label: string;
  emoji: string;
  /** 탭·선택 UI에 표시할 짧은 이름 */
  shortLabel: string;
}[] = [
  { id: "FREE", label: "자유", shortLabel: "자유", emoji: "💬" },
  { id: "HUMOR", label: "유머 / 이슈", shortLabel: "유머·이슈", emoji: "😂" },
  { id: "GAME", label: "게임", shortLabel: "게임", emoji: "🎮" },
  { id: "SPORTS", label: "스포츠", shortLabel: "스포츠", emoji: "⚽" },
  {
    id: "CREATOR",
    label: "크리에이터 (스트리머 / 버튜버)",
    shortLabel: "크리에이터",
    emoji: "📡",
  },
  {
    id: "MUSIC",
    label: "음악 (보카로 / 우타이테)",
    shortLabel: "음악",
    emoji: "🎵",
  },
  { id: "CREATIVE", label: "창작 / 팬아트", shortLabel: "창작·팬아트", emoji: "🎨" },
  { id: "SUBCULTURE", label: "서브컬쳐", shortLabel: "서브컬쳐", emoji: "✨" },
  { id: "IT", label: "IT / 장비", shortLabel: "IT·장비", emoji: "💻" },
  { id: "FOOD", label: "음식 / 맛집", shortLabel: "음식·맛집", emoji: "🍜" },
  { id: "INFO", label: "정보 / 질문", shortLabel: "정보·질문", emoji: "❓" },
];

/** 이전 taxonomy → v3 매핑 (마이그레이션 전 데이터 표시용) */
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
  customCategoryLabel?: string | null
): string {
  return resolveCommunityCategoryDisplay(category, customCategoryLabel).label;
}

export function communityCategoryMeta(category: string) {
  const normalized = normalizeCommunityCategory(category) ?? category;
  return COMMUNITY_CATEGORY_OPTIONS.find((c) => c.id === normalized) ?? null;
}

export function resolveCommunityCategoryDisplay(
  category: string,
  customCategoryLabel?: string | null
): { label: string; shortLabel: string; emoji: string } {
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

export function communityCategoryTabLabel(
  category: string,
  customCategoryLabel?: string | null
): string {
  const display = resolveCommunityCategoryDisplay(category, customCategoryLabel);
  return `${display.emoji} ${display.shortLabel}`;
}

export function validateCustomCategoryLabel(label: string | undefined | null): string | null {
  const trimmed = label?.trim();
  if (!trimmed) return "카테고리 이름을 입력해 주세요.";
  if (trimmed.length < 2) return "카테고리 이름은 2자 이상 입력해 주세요.";
  if (trimmed.length > 24) return "카테고리 이름은 24자 이하로 입력해 주세요.";
  return null;
}
