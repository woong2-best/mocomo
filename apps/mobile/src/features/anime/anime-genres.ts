import { uiText } from "@/i18n/ui-text";

/** Mobile-local genre pills — mirrors web ANIME_GENRES labels. */
export const MOBILE_ANIME_GENRES = [
  { id: "ACTION", labelKo: "액션", labelEn: "Action" },
  { id: "ROMANCE", labelKo: "로맨스", labelEn: "Romance" },
  { id: "COMEDY", labelKo: "코미디", labelEn: "Comedy" },
  { id: "FANTASY", labelKo: "판타지", labelEn: "Fantasy" },
  { id: "SCI_FI", labelKo: "SF", labelEn: "Sci-fi" },
  { id: "SLICE_OF_LIFE", labelKo: "일상", labelEn: "Slice of life" },
  { id: "HORROR", labelKo: "호러", labelEn: "Horror" },
  { id: "SPORTS", labelKo: "스포츠", labelEn: "Sports" },
  { id: "MECHA", labelKo: "메카", labelEn: "Mecha" },
  { id: "ISEKAI", labelKo: "이세계", labelEn: "Isekai" },
  { id: "SCHOOL", labelKo: "학원", labelEn: "School" },
  { id: "MUSIC", labelKo: "음악", labelEn: "Music" },
  { id: "MYSTERY", labelKo: "미스터리", labelEn: "Mystery" },
  { id: "SUPERNATURAL", labelKo: "초자연", labelEn: "Supernatural" },
  { id: "DRAMA", labelKo: "드라마", labelEn: "Drama" },
  { id: "ADVENTURE", labelKo: "모험", labelEn: "Adventure" },
  { id: "OTHER", labelKo: "기타", labelEn: "Other" },
] as const;

export type MobileAnimeGenreId = (typeof MOBILE_ANIME_GENRES)[number]["id"];

export function genreToApiParam(id: MobileAnimeGenreId): string {
  return id.toLowerCase().replace(/_/g, "-");
}

export function genreLabel(genre: string | null | undefined, locale?: string): string {
  if (!genre) return "";
  const hit = MOBILE_ANIME_GENRES.find((g) => g.id === genre);
  if (hit) return uiText(locale, hit.labelKo, hit.labelEn);
  return genre;
}

/** @deprecated use MOBILE_ANIME_GENRES with uiText */
export function mobileAnimeGenrePillLabel(
  g: (typeof MOBILE_ANIME_GENRES)[number],
  locale?: string
): string {
  return uiText(locale, g.labelKo, g.labelEn);
}
