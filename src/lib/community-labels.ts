import type { CommunityCategory } from "@prisma/client";

export const COMMUNITY_CATEGORY_OPTIONS: { id: CommunityCategory; label: string }[] = [
  { id: "ANIME", label: "애니" },
  { id: "MANGA", label: "만화" },
  { id: "GAME", label: "게임" },
  { id: "VTUBER", label: "버튜버" },
  { id: "COSPLAY", label: "코스프레" },
  { id: "FIGURE", label: "피규어" },
  { id: "ART", label: "그림·일러스트" },
  { id: "MUSIC", label: "음악" },
  { id: "AI_ART", label: "AI 아트" },
  { id: "LIGHT_NOVEL", label: "라이트노벨" },
  { id: "GOODS", label: "굿즈" },
  { id: "OTHER", label: "기타" },
];

export function communityCategoryLabel(category: string): string {
  return COMMUNITY_CATEGORY_OPTIONS.find((c) => c.id === category)?.label ?? category;
}
