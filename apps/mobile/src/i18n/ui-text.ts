/** Inline KO/EN until keys exist in the API message catalog. */
export function uiText(locale: string | undefined, ko: string, en: string): string {
  return locale === "ko" ? ko : en;
}
