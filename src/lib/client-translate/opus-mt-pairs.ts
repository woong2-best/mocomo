/**
 * Helsinki-NLP Opus-MT pairs that exist as Transformers.js ONNX conversions.
 * Only these directions are offered. No English pivot.
 *
 * Verified 2026-10-11 on Hugging Face (Xenova / onnx-community).
 * There is no browser-ready opus-mt-en-ko, so Korean is not a target.
 */

export const POST_TRANSLATE_OFF = "off";

/** Languages we can translate *into* with a dedicated incoming model. */
export const POST_TRANSLATE_LANGS = [
  "en",
  "ja",
  "zh",
  "de",
  "fr",
  "es",
  "it",
  "ru",
  "ar",
  "vi",
  "id",
  "hi",
  "nl",
  "uk",
  "tr",
  "sv",
  "da",
  "fi",
  "cs",
  "hu",
  "ro",
] as const;

export type PostTranslateLang = (typeof POST_TRANSLATE_LANGS)[number];
export type PostTranslateInto = typeof POST_TRANSLATE_OFF | PostTranslateLang;

export const OPUS_MUL_EN = "Xenova/opus-mt-mul-en";

/** Direct pair models only. Key is `src:tgt`. */
export const OPUS_PAIR_MODELS: Record<string, string> = {
  "ko:en": "Xenova/opus-mt-ko-en",
  "ja:en": "Xenova/opus-mt-ja-en",
  "zh:en": "Xenova/opus-mt-zh-en",
  "ar:en": "Xenova/opus-mt-ar-en",
  "de:en": "Xenova/opus-mt-de-en",
  "es:en": "Xenova/opus-mt-es-en",
  "fr:en": "Xenova/opus-mt-fr-en",
  "it:en": "Xenova/opus-mt-it-en",
  "ru:en": "Xenova/opus-mt-ru-en",
  "vi:en": "Xenova/opus-mt-vi-en",
  "id:en": "Xenova/opus-mt-id-en",
  "hi:en": "Xenova/opus-mt-hi-en",
  "nl:en": "Xenova/opus-mt-nl-en",
  "uk:en": "Xenova/opus-mt-uk-en",
  "tr:en": "Xenova/opus-mt-tc-big-tr-en",
  "sv:en": "Xenova/opus-mt-sv-en",
  "da:en": "Xenova/opus-mt-da-en",
  "fi:en": "Xenova/opus-mt-fi-en",
  "cs:en": "Xenova/opus-mt-cs-en",
  "hu:en": "Xenova/opus-mt-hu-en",
  "th:en": "Xenova/opus-mt-th-en",
  "pl:en": "Xenova/opus-mt-pl-en",
  "et:en": "Xenova/opus-mt-et-en",
  "af:en": "Xenova/opus-mt-af-en",

  "en:ja": "Xenova/opus-mt-en-jap",
  "en:zh": "Xenova/opus-mt-en-zh",
  "en:de": "Xenova/opus-mt-en-de",
  "en:fr": "Xenova/opus-mt-en-fr",
  "en:es": "Xenova/opus-mt-en-es",
  "en:it": "Xenova/opus-mt-en-it",
  "en:ru": "Xenova/opus-mt-en-ru",
  "en:ar": "Xenova/opus-mt-en-ar",
  "en:vi": "Xenova/opus-mt-en-vi",
  "en:id": "Xenova/opus-mt-en-id",
  "en:hi": "Xenova/opus-mt-en-hi",
  "en:nl": "Xenova/opus-mt-en-nl",
  "en:uk": "Xenova/opus-mt-en-uk",
  "en:tr": "onnx-community/opus-mt-tc-big-en-tr",
  "en:sv": "Xenova/opus-mt-en-sv",
  "en:da": "Xenova/opus-mt-en-da",
  "en:fi": "Xenova/opus-mt-en-fi",
  "en:cs": "Xenova/opus-mt-en-cs",
  "en:hu": "Xenova/opus-mt-en-hu",
  "en:ro": "Xenova/opus-mt-en-ro",

  "de:es": "Xenova/opus-mt-de-es",
  "de:fr": "Xenova/opus-mt-de-fr",
  "es:de": "Xenova/opus-mt-es-de",
  "es:fr": "Xenova/opus-mt-es-fr",
  "es:it": "Xenova/opus-mt-es-it",
  "es:ru": "Xenova/opus-mt-es-ru",
  "fr:de": "Xenova/opus-mt-fr-de",
  "fr:es": "Xenova/opus-mt-fr-es",
  "fr:ru": "Xenova/opus-mt-fr-ru",
  "it:es": "Xenova/opus-mt-it-es",
  "it:fr": "Xenova/opus-mt-it-fr",
  "ru:es": "Xenova/opus-mt-ru-es",
  "ru:fr": "Xenova/opus-mt-ru-fr",
  "ru:uk": "Xenova/opus-mt-ru-uk",
  "uk:ru": "Xenova/opus-mt-uk-ru",
  "nl:fr": "Xenova/opus-mt-nl-fr",
};

const LANG_SET = new Set<string>(POST_TRANSLATE_LANGS);

export function isPostTranslateLang(value: string): value is PostTranslateLang {
  return LANG_SET.has(value);
}

export function isPostTranslateInto(value: string): value is PostTranslateInto {
  return value === POST_TRANSLATE_OFF || isPostTranslateLang(value);
}

export function resolveOpusModel(sourceLang: string | null, targetLang: string): string | null {
  if (!targetLang || targetLang === POST_TRANSLATE_OFF) return null;
  if (sourceLang && sourceLang === targetLang) return null;
  if (sourceLang) {
    const pair = OPUS_PAIR_MODELS[`${sourceLang}:${targetLang}`];
    if (pair) return pair;
  }
  if (targetLang === "en") return OPUS_MUL_EN;
  return null;
}

export function postTranslateLanguageLabel(code: PostTranslateLang, uiLocale = "en"): string {
  try {
    return new Intl.DisplayNames([uiLocale, "en"], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** navigator.language → a listed target, or Don't translate when no model exists. */
export function defaultPostTranslateFromBrowser(language = ""): PostTranslateInto {
  const raw = language.trim().toLowerCase();
  if (!raw) return POST_TRANSLATE_OFF;
  const primary = raw.split("-")[0] ?? raw;
  const mapped = primary === "zh" ? "zh" : primary;
  return isPostTranslateLang(mapped) ? mapped : POST_TRANSLATE_OFF;
}

/**
 * Profile country → a listed target. Korea/countries without a target model
 * are omitted so we can fall through (e.g. US + Korean browser → English).
 */
const COUNTRY_TO_POST_TRANSLATE: Record<string, PostTranslateLang> = {
  US: "en",
  GB: "en",
  AU: "en",
  NZ: "en",
  IE: "en",
  CA: "en",
  SG: "en",
  JP: "ja",
  CN: "zh",
  TW: "zh",
  HK: "zh",
  DE: "de",
  AT: "de",
  CH: "de",
  FR: "fr",
  BE: "fr",
  ES: "es",
  MX: "es",
  AR: "es",
  CL: "es",
  CO: "es",
  PE: "es",
  IT: "it",
  RU: "ru",
  SA: "ar",
  AE: "ar",
  EG: "ar",
  VN: "vi",
  ID: "id",
  IN: "hi",
  NL: "nl",
  UA: "uk",
  TR: "tr",
  SE: "sv",
  DK: "da",
  FI: "fi",
  CZ: "cs",
  HU: "hu",
  RO: "ro",
};

export function defaultPostTranslateFromCountry(countryCode = ""): PostTranslateInto | null {
  const mapped = COUNTRY_TO_POST_TRANSLATE[countryCode.trim().toUpperCase()];
  return mapped ?? null;
}

/** Browser language if we can translate into it, otherwise country, otherwise off. */
export function inferPostTranslateInto(
  browserLanguage = "",
  countryCode = ""
): PostTranslateInto {
  const fromBrowser = defaultPostTranslateFromBrowser(browserLanguage);
  if (fromBrowser !== POST_TRANSLATE_OFF) return fromBrowser;
  return defaultPostTranslateFromCountry(countryCode) ?? POST_TRANSLATE_OFF;
}
