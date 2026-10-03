import type { Locale } from "@/i18n";
import { englishText } from "@/i18n/messages";
import { mergeUiKeyTable, uiMessagesAppVersion } from "@/i18n/ui-key-cache";
import {
  joinUiTranslatedSegments,
  splitUiTranslatableSegments,
} from "@/i18n/ui-translate-segments";
import { localeToMlKit, MlLang } from "@/lib/translate/mlkit-locale";
import { enqueueTranslation } from "@/lib/translate/queue";

const SKIP_KEY_PREFIXES = ["legal.", "wiki.", "brand."];

export function uiKeyNeedsMlKit(key: string, targetLocale: Locale): boolean {
  if (targetLocale === "en") return false;
  if (SKIP_KEY_PREFIXES.some((p) => key.startsWith(p))) return false;
  return Boolean(localeToMlKit(targetLocale));
}

type TranslateTextModule = {
  downloadModel?: (opts: Record<string, unknown>) => Promise<void>;
  translate?: (opts: Record<string, unknown>) => Promise<unknown>;
};

async function loadTranslateText(): Promise<TranslateTextModule | null> {
  try {
    return (await import("@react-native-ml-kit/translate-text")).default as unknown as TranslateTextModule;
  } catch {
    return null;
  }
}

export async function prefetchUiTranslationModel(targetLocale: Locale): Promise<void> {
  if (targetLocale === "en") return;
  const targetLanguage = localeToMlKit(targetLocale);
  if (!targetLanguage) return;
  const TranslateText = await loadTranslateText();
  if (!TranslateText?.downloadModel) return;
  try {
    await TranslateText.downloadModel({
      sourceLanguage: MlLang.ENGLISH,
      targetLanguage,
      requireWifi: true,
    });
  } catch {
    /* fall back to English at runtime */
  }
}

async function translateEnglishFragment(
  text: string,
  targetLocale: Locale
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return text;
  const targetLanguage = localeToMlKit(targetLocale);
  if (!targetLanguage) return text;

  const TranslateText = await loadTranslateText();
  if (!TranslateText?.translate) return text;

  const result = (await TranslateText.translate({
    text: trimmed,
    sourceLanguage: MlLang.ENGLISH,
    targetLanguage,
    downloadModelIfNeeded: true,
    requireWifi: true,
  })) as unknown as string;

  const translated = typeof result === "string" ? result.trim() : trimmed;
  if (!translated) return text;
  const lead = text.match(/^\s*/)?.[0] ?? "";
  const trail = text.match(/\s*$/)?.[0] ?? "";
  return `${lead}${translated}${trail}`;
}

export async function translateUiEnglishString(
  english: string,
  targetLocale: Locale
): Promise<string> {
  if (!english.trim() || targetLocale === "en") return english;
  if (!localeToMlKit(targetLocale)) return english;

  return enqueueTranslation(async () => {
    const segments = splitUiTranslatableSegments(english);
    const translatedParts = new Map<number, string>();
    let textIndex = 0;
    for (const segment of segments) {
      if (segment.kind !== "text") continue;
      if (!segment.value.trim()) {
        textIndex += 1;
        continue;
      }
      translatedParts.set(
        textIndex,
        await translateEnglishFragment(segment.value, targetLocale)
      );
      textIndex += 1;
    }
    return joinUiTranslatedSegments(segments, translatedParts);
  });
}

const inflight = new Map<string, Promise<string | null>>();

/** Translate one catalog key; returns null when unchanged / skipped. */
export function translateUiKey(
  key: string,
  targetLocale: Locale,
  appVersion = uiMessagesAppVersion()
): Promise<string | null> {
  if (!uiKeyNeedsMlKit(key, targetLocale)) return Promise.resolve(null);
  const dedupe = `${appVersion}:${targetLocale}:${key}`;
  const existing = inflight.get(dedupe);
  if (existing) return existing;

  const job = (async () => {
    const english = englishText(key);
    if (!english || english === key) return null;
    try {
      const translated = await translateUiEnglishString(english, targetLocale);
      if (!translated || translated === english) return null;
      await mergeUiKeyTable(targetLocale, { [key]: translated }, appVersion);
      return translated;
    } catch {
      return null;
    } finally {
      inflight.delete(dedupe);
    }
  })();

  inflight.set(dedupe, job);
  return job;
}
