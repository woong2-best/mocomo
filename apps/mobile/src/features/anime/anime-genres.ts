import { translate } from "@/i18n/runtime";

/** Mobile-local genre pills — mirrors web ANIME_GENRES labels. */
export const MOBILE_ANIME_GENRES = [
  { id: "COSPLAY", labelKey: "m.anime.cosplay" },
  { id: "ACTION", labelKey: "m.anime.action" },
  { id: "ROMANCE", labelKey: "m.anime.romance" },
  { id: "COMEDY", labelKey: "m.anime.comedy" },
  { id: "FANTASY", labelKey: "m.anime.fantasy" },
  { id: "SCI_FI", labelKey: "m.anime.sci_fi" },
  { id: "SLICE_OF_LIFE", labelKey: "m.anime.slice_of_life" },
  { id: "HORROR", labelKey: "m.anime.horror" },
  { id: "SPORTS", labelKey: "m.anime.sports" },
  { id: "MECHA", labelKey: "m.anime.mecha" },
  { id: "ISEKAI", labelKey: "m.anime.isekai" },
  { id: "SCHOOL", labelKey: "m.anime.school" },
  { id: "MUSIC", labelKey: "m.anime.music" },
  { id: "MYSTERY", labelKey: "m.anime.mystery" },
  { id: "SUPERNATURAL", labelKey: "m.anime.supernatural" },
  { id: "DRAMA", labelKey: "m.anime.drama" },
  { id: "ADVENTURE", labelKey: "m.anime.adventure" },
  { id: "OTHER", labelKey: "m.profile.other" },
] as const;

export type MobileAnimeGenreId = (typeof MOBILE_ANIME_GENRES)[number]["id"];

export function genreToApiParam(id: MobileAnimeGenreId): string {
  return id.toLowerCase().replace(/_/g, "-");
}

export function genreLabel(genre: string | null | undefined, _locale?: string): string {
  if (!genre) return "";
  const hit = MOBILE_ANIME_GENRES.find((g) => g.id === genre);
  if (hit) return translate(hit.labelKey);
  return genre;
}

/** @deprecated use MOBILE_ANIME_GENRES with labelKey */
export function mobileAnimeGenrePillLabel(
  g: (typeof MOBILE_ANIME_GENRES)[number],
  _locale?: string
): string {
  return translate(g.labelKey);
}
