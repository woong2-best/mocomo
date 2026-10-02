import type { Locale } from "@/lib/i18n/config";
import { lookupAnimeTitleCatalog, type AnimeTitleFields } from "@/lib/anime-title-catalog";

/** 동기 표시 — 카탈로그·DB titleEn 기준 (사이드바 즉시 렌더) */
export function displayAnimeTitle(anime: AnimeTitleFields, locale: Locale): string {
  const catalog = lookupAnimeTitleCatalog(anime, locale);
  if (catalog) return catalog;

  

  const en = anime.titleEn?.trim();
  return en || anime.title;
}

export function needsAnimeTitleAutoResolve(locale: Locale): boolean {
  return locale === "ja" || locale === "zh";
}
