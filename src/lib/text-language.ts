import type { Locale } from "@/lib/i18n/config";
import { needsClientTranslation } from "@/lib/client-translate/detect-source";

/** UI 언어별 원문 언어 표기 (트위터 "원문 언어 영어" 스타일) */
const SOURCE_LANGUAGE_LABELS: Partial<Record<Locale, Partial<Record<Locale, string>>>> = {
  ko: { ko: "한국어", en: "영어", ja: "일본어", zh: "중국어" },
  en: { ko: "Korean", en: "English", ja: "Japanese", zh: "Chinese" },
  ja: { ko: "韓国語", en: "英語", ja: "日本語", zh: "中国語" },
  zh: { ko: "韩语", en: "英语", ja: "日语", zh: "中文" },
};

function displayLanguageName(code: string, uiLocale: Locale): string {
  try {
    return new Intl.DisplayNames([uiLocale], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

function stripNoise(text: string): string {
  return text
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[#@]\w+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** 휴리스틱 언어 감지 — 짧은 글·혼합 언어는 null */
export function detectTextLanguage(text: string): Locale | null {
  const sample = stripNoise(text);
  if (sample.length < 2) return null;

  const hangul = (sample.match(/[\uAC00-\uD7AF]/g) || []).length;
  const kana = (sample.match(/[\u3040-\u30FF]/g) || []).length;
  const han = (sample.match(/[\u4E00-\u9FFF]/g) || []).length;
  const latin = (sample.match(/[A-Za-z]/g) || []).length;
  const letters = hangul + kana + han + latin;
  if (letters < 2) return null;

  const ratios = {
    ko: hangul / letters,
    ja: kana / letters,
    zh: han / letters,
    en: latin / letters,
  };

  if (ratios.ko >= 0.25) return "ko";
  if (ratios.ja >= 0.12) return "ja";
  if (ratios.zh >= 0.25 && kana === 0 && hangul === 0) return "zh";
  if (ratios.en >= 0.45) return "en";

  return null;
}

export function needsTranslation(text: string, userLocale: Locale): boolean {
  return needsClientTranslation(text, userLocale);
}

export function sourceLanguageLabel(source: Locale, uiLocale: Locale): string {
  const table = SOURCE_LANGUAGE_LABELS[uiLocale] ?? SOURCE_LANGUAGE_LABELS.en;
  return (
    table?.[source] ??
    SOURCE_LANGUAGE_LABELS.en?.[source] ??
    displayLanguageName(source, uiLocale)
  );
}
