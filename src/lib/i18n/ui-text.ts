/** Inline KO/EN copy for strings not yet in locale JSON catalogs. */
export function uiText(locale: string | undefined, ko: string, en: string): string {
  return locale === "ko" ? ko : en;
}
