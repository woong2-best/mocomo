import { franc } from "franc";
import type { Locale } from "@/i18n";
import { TranslateLanguage } from "@react-native-ml-kit/translate-text";
import { localeToMlKit, mlKitToLocale } from "@/lib/translate/mlkit-locale";
import { isTextWorthTranslating } from "@/lib/translate/text-filter";

function stripNoise(text: string): string {
  return text
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[#@]\w+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectHeuristicMl(text: string): TranslateLanguage | null {
  const sample = stripNoise(text);
  if (sample.length < 2) return null;

  const hangul = (sample.match(/[\uAC00-\uD7AF]/g) || []).length;
  const kana = (sample.match(/[\u3040-\u30FF]/g) || []).length;
  const han = (sample.match(/[\u4E00-\u9FFF]/g) || []).length;
  const latin = (sample.match(/[A-Za-z]/g) || []).length;
  const letters = hangul + kana + han + latin;
  if (letters < 2) return null;

  if (hangul / letters >= 0.25) return TranslateLanguage.KOREAN;
  if (kana / letters >= 0.12) return TranslateLanguage.JAPANESE;
  if (han / letters >= 0.25 && kana === 0 && hangul === 0) return TranslateLanguage.CHINESE;
  if (latin / letters >= 0.45) return TranslateLanguage.ENGLISH;

  return null;
}

const FRANC_TO_ML: Record<string, TranslateLanguage> = {
  kor: TranslateLanguage.KOREAN,
  eng: TranslateLanguage.ENGLISH,
  jpn: TranslateLanguage.JAPANESE,
  cmn: TranslateLanguage.CHINESE,
  zho: TranslateLanguage.CHINESE,
  fra: TranslateLanguage.FRENCH,
  deu: TranslateLanguage.GERMAN,
  spa: TranslateLanguage.SPANISH,
  por: TranslateLanguage.PORTUGUESE,
  ita: TranslateLanguage.ITALIAN,
  nld: TranslateLanguage.DUTCH,
  pol: TranslateLanguage.POLISH,
  rus: TranslateLanguage.RUSSIAN,
  ukr: TranslateLanguage.UKRAINIAN,
  arb: TranslateLanguage.ARABIC,
  ara: TranslateLanguage.ARABIC,
  heb: TranslateLanguage.HEBREW,
  tur: TranslateLanguage.TURKISH,
  pes: TranslateLanguage.PERSIAN,
  fas: TranslateLanguage.PERSIAN,
  hin: TranslateLanguage.HINDI,
  ben: TranslateLanguage.BENGALI,
  tam: TranslateLanguage.TAMIL,
  tel: TranslateLanguage.TELUGU,
  mar: TranslateLanguage.MARATHI,
  urd: TranslateLanguage.URDU,
  tha: TranslateLanguage.THAI,
  vie: TranslateLanguage.VIETNAMESE,
  ind: TranslateLanguage.INDONESIAN,
  msa: TranslateLanguage.MALAY,
  zsm: TranslateLanguage.MALAY,
  tgl: TranslateLanguage.TAGALOG,
  fil: TranslateLanguage.TAGALOG,
  swh: TranslateLanguage.SWAHILI,
  swe: TranslateLanguage.SWEDISH,
  nob: TranslateLanguage.NORWEGIAN,
  nor: TranslateLanguage.NORWEGIAN,
  dan: TranslateLanguage.DANISH,
  fin: TranslateLanguage.FINNISH,
  ces: TranslateLanguage.CZECH,
  slk: TranslateLanguage.SLOVAK,
  hun: TranslateLanguage.HUNGARIAN,
  ron: TranslateLanguage.ROMANIAN,
  bul: TranslateLanguage.BULGARIAN,
  hrv: TranslateLanguage.CROATIAN,
  slv: TranslateLanguage.SLOVENIAN,
  lit: TranslateLanguage.LITHUANIAN,
  lvs: TranslateLanguage.LATVIAN,
  lav: TranslateLanguage.LATVIAN,
  est: TranslateLanguage.ESTONIAN,
  ell: TranslateLanguage.GREEK,
  cat: TranslateLanguage.CATALAN,
  glg: TranslateLanguage.GALICIAN,
  isl: TranslateLanguage.ICELANDIC,
  gle: TranslateLanguage.IRISH,
  cym: TranslateLanguage.WELSH,
  afr: TranslateLanguage.AFRIKAANS,
  bel: TranslateLanguage.BELARUSIAN,
  kat: TranslateLanguage.GEORGIAN,
  mlt: TranslateLanguage.MALTESE,
  epo: TranslateLanguage.ESPERANTO,
  mkd: TranslateLanguage.MACEDONIAN,
  als: TranslateLanguage.ALBANIAN,
  sqi: TranslateLanguage.ALBANIAN,
};

export function detectSourceMlKit(text: string): TranslateLanguage | null {
  if (!isTextWorthTranslating(text)) return null;

  const heuristic = detectHeuristicMl(text);
  if (heuristic) return heuristic;

  const sample = stripNoise(text);
  if (sample.length >= 10) {
    const iso = franc(sample, { minLength: 10 });
    if (iso && iso !== "und" && FRANC_TO_ML[iso]) {
      return FRANC_TO_ML[iso];
    }
  }

  const latin = (sample.match(/[A-Za-z]/g) || []).length;
  const letters = sample.replace(/[^\p{L}]/gu, "").length;
  if (letters >= 2 && latin / letters >= 0.5) {
    return TranslateLanguage.ENGLISH;
  }

  return null;
}

export function detectSourceLocale(text: string): Locale | null {
  const ml = detectSourceMlKit(text);
  if (!ml) return null;
  return mlKitToLocale(ml);
}

export function needsClientTranslation(text: string, viewerLocale: Locale): boolean {
  const source = detectSourceMlKit(text);
  const target = localeToMlKit(viewerLocale);
  return Boolean(source && target && source !== target);
}
