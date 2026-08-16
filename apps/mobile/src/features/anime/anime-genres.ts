/** Mobile-local genre pills — mirrors web ANIME_GENRES labels. */
export const MOBILE_ANIME_GENRES = [
  { id: "ACTION", label: "액션" },
  { id: "ROMANCE", label: "로맨스" },
  { id: "COMEDY", label: "코미디" },
  { id: "FANTASY", label: "판타지" },
  { id: "SCI_FI", label: "SF" },
  { id: "SLICE_OF_LIFE", label: "일상" },
  { id: "HORROR", label: "호러" },
  { id: "SPORTS", label: "스포츠" },
  { id: "MECHA", label: "메카" },
  { id: "ISEKAI", label: "이세계" },
  { id: "SCHOOL", label: "학원" },
  { id: "MUSIC", label: "음악" },
  { id: "MYSTERY", label: "미스터리" },
  { id: "SUPERNATURAL", label: "초자연" },
  { id: "DRAMA", label: "드라마" },
  { id: "ADVENTURE", label: "모험" },
  { id: "OTHER", label: "기타" },
] as const;

export type MobileAnimeGenreId = (typeof MOBILE_ANIME_GENRES)[number]["id"];

export function genreToApiParam(id: MobileAnimeGenreId): string {
  return id.toLowerCase().replace(/_/g, "-");
}
