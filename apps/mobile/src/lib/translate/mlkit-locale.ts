import { TranslateLanguage } from "@react-native-ml-kit/translate-text";
import type { Locale } from "@/i18n";

/** MoCoMo locale → Google ML Kit BCP-47 (TranslateLanguage enum value). */
export const LOCALE_TO_ML: Partial<Record<Locale, TranslateLanguage>> = {
  ko: TranslateLanguage.KOREAN,
  en: TranslateLanguage.ENGLISH,
  ja: TranslateLanguage.JAPANESE,
  zh: TranslateLanguage.CHINESE,
  "zh-TW": TranslateLanguage.CHINESE,
  el: TranslateLanguage.GREEK,
  fr: TranslateLanguage.FRENCH,
  de: TranslateLanguage.GERMAN,
  es: TranslateLanguage.SPANISH,
  pt: TranslateLanguage.PORTUGUESE,
  "pt-BR": TranslateLanguage.PORTUGUESE,
  it: TranslateLanguage.ITALIAN,
  nl: TranslateLanguage.DUTCH,
  pl: TranslateLanguage.POLISH,
  ru: TranslateLanguage.RUSSIAN,
  uk: TranslateLanguage.UKRAINIAN,
  ar: TranslateLanguage.ARABIC,
  he: TranslateLanguage.HEBREW,
  tr: TranslateLanguage.TURKISH,
  fa: TranslateLanguage.PERSIAN,
  hi: TranslateLanguage.HINDI,
  bn: TranslateLanguage.BENGALI,
  ta: TranslateLanguage.TAMIL,
  te: TranslateLanguage.TELUGU,
  mr: TranslateLanguage.MARATHI,
  ur: TranslateLanguage.URDU,
  th: TranslateLanguage.THAI,
  vi: TranslateLanguage.VIETNAMESE,
  id: TranslateLanguage.INDONESIAN,
  ms: TranslateLanguage.MALAY,
  fil: TranslateLanguage.TAGALOG,
  sw: TranslateLanguage.SWAHILI,
  sv: TranslateLanguage.SWEDISH,
  no: TranslateLanguage.NORWEGIAN,
  da: TranslateLanguage.DANISH,
  fi: TranslateLanguage.FINNISH,
  cs: TranslateLanguage.CZECH,
  sk: TranslateLanguage.SLOVAK,
  hu: TranslateLanguage.HUNGARIAN,
  ro: TranslateLanguage.ROMANIAN,
  bg: TranslateLanguage.BULGARIAN,
  hr: TranslateLanguage.CROATIAN,
  sl: TranslateLanguage.SLOVENIAN,
  lt: TranslateLanguage.LITHUANIAN,
  lv: TranslateLanguage.LATVIAN,
  et: TranslateLanguage.ESTONIAN,
  sq: TranslateLanguage.ALBANIAN,
  mk: TranslateLanguage.MACEDONIAN,
  ca: TranslateLanguage.CATALAN,
  gl: TranslateLanguage.GALICIAN,
  is: TranslateLanguage.ICELANDIC,
  ga: TranslateLanguage.IRISH,
  cy: TranslateLanguage.WELSH,
  af: TranslateLanguage.AFRIKAANS,
  be: TranslateLanguage.BELARUSIAN,
  ka: TranslateLanguage.GEORGIAN,
  mt: TranslateLanguage.MALTESE,
  eo: TranslateLanguage.ESPERANTO,
};

const ML_TO_LOCALE = new Map<TranslateLanguage, Locale>(
  Object.entries(LOCALE_TO_ML).map(([locale, ml]) => [ml!, locale as Locale])
);

export function localeToMlKit(locale: Locale): TranslateLanguage | null {
  return LOCALE_TO_ML[locale] ?? null;
}

export function mlKitToLocale(code: TranslateLanguage): Locale | null {
  return ML_TO_LOCALE.get(code) ?? null;
}
