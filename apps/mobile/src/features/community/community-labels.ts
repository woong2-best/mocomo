/** Matches web `src/lib/community-labels.ts` */
export const COMMUNITY_CATEGORY_OPTIONS = [
  { id: "ALL", shortLabel: "전체", emoji: "", label: "전체" },
  { id: "GAME", shortLabel: "게임", emoji: "🎮", label: "게임" },
  { id: "ANIME", shortLabel: "애니", emoji: "🎬", label: "애니" },
  { id: "COMIC", shortLabel: "코믹", emoji: "📚", label: "코믹" },
  { id: "VTUBER", shortLabel: "스트리머", emoji: "📡", label: "스트리머" },
  { id: "AI", shortLabel: "버튜버", emoji: "🎭", label: "버튜버" },
  { id: "UTAITE", shortLabel: "우타이테", emoji: "🎤", label: "우타이테" },
  { id: "VOCALOID", shortLabel: "보카로", emoji: "🎧", label: "보카로" },
  { id: "FANART", shortLabel: "팬아트", emoji: "🎨", label: "팬아트" },
  { id: "COSPLAY", shortLabel: "코스", emoji: "👗", label: "코스" },
  { id: "GOODS", shortLabel: "굿즈", emoji: "🎁", label: "굿즈" },
  { id: "FIGURE", shortLabel: "피규어", emoji: "🗿", label: "피규어" },
] as const;

export type CommunityCategoryId = Exclude<(typeof COMMUNITY_CATEGORY_OPTIONS)[number]["id"], "ALL">;

export function communityCategoryMeta(category: string) {
  return COMMUNITY_CATEGORY_OPTIONS.find((c) => c.id === category && c.id !== "ALL") ?? null;
}
