import { franc } from "franc";
import type { Locale } from "@/i18n";
import {
  MlLang,
  localeToMlKit,
  mlKitToLocale,
  type TranslateLanguage,
} from "@/lib/translate/mlkit-locale";
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

  if (hangul / letters >= 0.25) return MlLang.KOREAN;
  if (kana / letters >= 0.12) return MlLang.JAPANESE;
  if (han / letters >= 0.25 && kana === 0 && hangul === 0) return MlLang.CHINESE;
  if (latin / letters >= 0.45) return MlLang.ENGLISH;

  return null;
}

const FRANC_TO_ML: Record<string, TranslateLanguage> = {
  kor: MlLang.KOREAN,
  eng: MlLang.ENGLISH,
  jpn: MlLang.JAPANESE,
  cmn: MlLang.CHINESE,
  zho: MlLang.CHINESE,
  fra: MlLang.FRENCH,
  deu: MlLang.GERMAN,
  spa: MlLang.SPANISH,
  por: MlLang.PORTUGUESE,
  ita: MlLang.ITALIAN,
  nld: MlLang.DUTCH,
  pol: MlLang.POLISH,
  rus: MlLang.RUSSIAN,
  ukr: MlLang.UKRAINIAN,
  arb: MlLang.ARABIC,
  ara: MlLang.ARABIC,
  heb: MlLang.HEBREW,
  tur: MlLang.TURKISH,
  pes: MlLang.PERSIAN,
  fas: MlLang.PERSIAN,
  hin: MlLang.HINDI,
  ben: MlLang.BENGALI,
  tam: MlLang.TAMIL,
  tel: MlLang.TELUGU,
  mar: MlLang.MARATHI,
  urd: MlLang.URDU,
  tha: MlLang.THAI,
  vie: MlLang.VIETNAMESE,
  ind: MlLang.INDONESIAN,
  msa: MlLang.MALAY,
  zsm: MlLang.MALAY,
  tgl: MlLang.TAGALOG,
  fil: MlLang.TAGALOG,
  swh: MlLang.SWAHILI,
  swe: MlLang.SWEDISH,
  nob: MlLang.NORWEGIAN,
  nor: MlLang.NORWEGIAN,
  dan: MlLang.DANISH,
  fin: MlLang.FINNISH,
  ces: MlLang.CZECH,
  slk: MlLang.SLOVAK,
  hun: MlLang.HUNGARIAN,
  ron: MlLang.ROMANIAN,
  bul: MlLang.BULGARIAN,
  hrv: MlLang.CROATIAN,
  slv: MlLang.SLOVENIAN,
  lit: MlLang.LITHUANIAN,
  lvs: MlLang.LATVIAN,
  lav: MlLang.LATVIAN,
  est: MlLang.ESTONIAN,
  ell: MlLang.GREEK,
  cat: MlLang.CATALAN,
  glg: MlLang.GALICIAN,
  isl: MlLang.ICELANDIC,
  gle: MlLang.IRISH,
  cym: MlLang.WELSH,
  afr: MlLang.AFRIKAANS,
  bel: MlLang.BELARUSIAN,
  kat: MlLang.GEORGIAN,
  mlt: MlLang.MALTESE,
  epo: MlLang.ESPERANTO,
  mkd: MlLang.MACEDONIAN,
  als: MlLang.ALBANIAN,
  sqi: MlLang.ALBANIAN,
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
    return MlLang.ENGLISH;
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
