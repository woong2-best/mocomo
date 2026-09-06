import { franc } from "franc";
import type { Locale } from "@/lib/i18n/config";
import { detectTextLanguage } from "@/lib/text-language";
import {
  iso6393ToNllb,
  localeToNllb,
  nllbToLocale,
  type NllbCode,
} from "@/lib/client-translate/nllb-codes";

function stripNoise(text: string): string {
  return text
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[#@]\w+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Detect source NLLB language code for UGC text. */
export function detectSourceNllb(text: string): NllbCode | null {
  const sample = stripNoise(text);
  if (sample.length < 2) return null;

  const heuristicLocale = detectTextLanguage(text);
  if (heuristicLocale) {
    return localeToNllb(heuristicLocale);
  }

  if (sample.length >= 10) {
    const iso = franc(sample, { minLength: 10 });
    if (iso && iso !== "und") {
      const fromFranc = iso6393ToNllb(iso);
      if (fromFranc) return fromFranc;
    }
  }

  const latin = (sample.match(/[A-Za-z]/g) || []).length;
  const letters = sample.replace(/[^\p{L}]/gu, "").length;
  if (letters >= 2 && latin / letters >= 0.5) {
    return "eng_Latn";
  }

  return null;
}

export function detectSourceLocale(text: string): Locale | null {
  const nllb = detectSourceNllb(text);
  if (!nllb) return null;
  return nllbToLocale(nllb);
}

export function needsClientTranslation(text: string, viewerLocale: Locale): boolean {
  const source = detectSourceNllb(text);
  const target = localeToNllb(viewerLocale);
  return Boolean(source && source !== target);
}
