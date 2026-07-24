import type { CommunityCategory } from "@prisma/client";

export const COMMUNITY_CATEGORY_OPTIONS: {
  id: CommunityCategory;
  label: string;
  emoji: string;
  /** 탭·선택 UI에 표시할 짧은 이름 */
  shortLabel: string;
}[] = [
  { id: "GAME", label: "게임", shortLabel: "게임", emoji: "🎮" },
  { id: "ANIME", label: "애니", shortLabel: "애니", emoji: "🎬" },
  { id: "COMIC", label: "코믹", shortLabel: "코믹", emoji: "📚" },
  { id: "VTUBER", label: "스트리머", shortLabel: "스트리머", emoji: "📡" },
  { id: "AI", label: "버튜버", shortLabel: "버튜버", emoji: "🎭" },
  { id: "UTAITE", label: "우타이테", shortLabel: "우타이테", emoji: "🎤" },
  { id: "VOCALOID", label: "보카로", shortLabel: "보카로", emoji: "🎧" },
  { id: "FANART", label: "팬아트", shortLabel: "팬아트", emoji: "🎨" },
  { id: "COSPLAY", label: "코스", shortLabel: "코스", emoji: "👗" },
  { id: "GOODS", label: "굿즈", shortLabel: "굿즈", emoji: "🎁" },
  { id: "FIGURE", label: "피규어", shortLabel: "피규어", emoji: "🗿" },
];

export const COMMUNITY_CATEGORY_IDS = COMMUNITY_CATEGORY_OPTIONS.map((c) => c.id);

export function isCommunityCategory(value: string): value is CommunityCategory {
  return (COMMUNITY_CATEGORY_IDS as readonly string[]).includes(value);
}

export function communityCategoryLabel(category: string): string {
  return COMMUNITY_CATEGORY_OPTIONS.find((c) => c.id === category)?.label ?? category;
}

export function communityCategoryMeta(category: string) {
  return COMMUNITY_CATEGORY_OPTIONS.find((c) => c.id === category) ?? null;
}

export function communityCategoryTabLabel(category: string): string {
  const meta = communityCategoryMeta(category);
  if (!meta) return category;
  return `${meta.emoji} ${meta.shortLabel}`;
}
