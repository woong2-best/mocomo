import type { Locale } from "@/lib/i18n/config";

const SPECIAL: Partial<Record<Locale, string>> = {
  ko: "Korean",
  en: "American English",
  ja: "Japanese",
  zh: "Simplified Chinese",
  "zh-TW": "Traditional Chinese",
  pt: "Portuguese",
  "pt-BR": "Brazilian Portuguese",
  fil: "Filipino",
};

export function targetLanguageForLocale(locale: Locale): string {
  if (SPECIAL[locale]) return SPECIAL[locale]!;
  try {
    const dn = new Intl.DisplayNames(["en"], { type: "language" });
    return dn.of(locale) ?? locale;
  } catch {
    return locale;
  }
}
