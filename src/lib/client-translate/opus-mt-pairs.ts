import { COUNTRY_TO_LANGUAGE, languageForCountry } from "@/lib/client-translate/country-language";

/**
 * Helsinki-NLP Opus-MT pairs that exist as Transformers.js ONNX conversions.
 * Only these directions run in the browser. No English pivot.
 *
 * Pairs that exist run in the browser. Every other direction, including Korean
 * and any country language, translates on the server when View translation is clicked.
 */

export const POST_TRANSLATE_OFF = "off";

/** Languages we can translate *into*. Korean is server-backed; the rest are Opus-MT. */
export const POST_TRANSLATE_LANGS = [
  "en",
  "ko",
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
/** "off", or an ISO 639 language code for the viewer's country. */
export type PostTranslateInto = string;

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

const LANGUAGE_CODE = /^[a-z]{2,3}$/;

export function isLanguageCode(value: string): boolean {
  return LANGUAGE_CODE.test(value);
}

export function isPostTranslateLang(value: string): value is PostTranslateLang {
  return (POST_TRANSLATE_LANGS as readonly string[]).includes(value);
}

/** "off", or any ISO 639 language. Country languages are not limited to Opus pairs. */
export function isPostTranslateInto(value: string): value is PostTranslateInto {
  return value === POST_TRANSLATE_OFF || isLanguageCode(value);
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

/**
 * Any target language can be translated on the server when no Opus pair exists.
 * A Korean viewer can read Japanese, Chinese, or English. A Japanese viewer can
 * read any source the same way.
 */
export function usesServerPostTranslation(targetLang: string): boolean {
  return isLanguageCode(targetLang);
}

/** Most common incoming pair for this viewer, used to start the download early. */
export function likelyWarmupModel(targetLang: string): string | null {
  if (!targetLang || targetLang === POST_TRANSLATE_OFF) return null;
  if (targetLang === "en") return OPUS_PAIR_MODELS["ko:en"] ?? OPUS_MUL_EN;
  return resolveOpusModel("en", targetLang);
}

export function postTranslateLanguageLabel(code: string, uiLocale = "en"): string {
  try {
    return new Intl.DisplayNames([uiLocale, "en"], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Browser language, used only when the profile has no country language. */
export function defaultPostTranslateFromBrowser(language = ""): PostTranslateInto {
  const raw = language.trim().toLowerCase();
  if (!raw) return POST_TRANSLATE_OFF;
  const primary = raw.split("-")[0] ?? raw;
  return isLanguageCode(primary) ? primary : POST_TRANSLATE_OFF;
}

export function defaultPostTranslateFromCountry(countryCode = ""): PostTranslateInto | null {
  return languageForCountry(countryCode);
}

/**
 * Country picks the language posts translate into.
 * Browser language is only a fallback when the country is unset.
 */
export function inferPostTranslateInto(
  browserLanguage = "",
  countryCode = ""
): PostTranslateInto {
  return (
    defaultPostTranslateFromCountry(countryCode) ??
    defaultPostTranslateFromBrowser(browserLanguage)
  );
}

/** Languages offered in settings: Opus targets plus every country language. */
export function postTranslateLanguageChoices(): string[] {
  return [...new Set<string>([...POST_TRANSLATE_LANGS, ...Object.values(COUNTRY_TO_LANGUAGE)])];
}
