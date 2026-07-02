import type { Locale } from "@/lib/i18n/config";
import { lookupAnimeTitleCatalog, type AnimeTitleFields } from "@/lib/anime-title-catalog";

/** 동기 표시 — 카탈로그·DB titleEn 기준 (사이드바 즉시 렌더) */
export function displayAnimeTitle(anime: AnimeTitleFields, locale: Locale): string {
  const catalog = lookupAnimeTitleCatalog(anime, locale);
  if (catalog) return catalog;

  if (locale === "ko") return anime.title;

  const en = anime.titleEn?.trim();
  if (locale === "en") return en || anime.title;

  if (locale === "ja") {
    if (en && /[\u3040-\u30ff\u4e00-\u9faf]/.test(en)) return en;
    return en || anime.title;
  }

  if (locale === "zh") {
    return en || anime.title;
  }

  return anime.title;
}

export function needsAnimeTitleAutoResolve(locale: Locale): boolean {
  return locale === "ja" || locale === "zh";
}
