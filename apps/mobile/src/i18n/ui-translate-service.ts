import type { Locale } from "@/i18n";
import { KEEP_ENGLISH_UI_KEYS } from "@/i18n/keep-english";
import { englishText } from "@/i18n/messages";
import { mergeUiKeyTable, uiMessagesAppVersion } from "@/i18n/ui-key-cache";
import {
  joinUiTranslatedSegments,
  splitUiTranslatableSegments,
} from "@/i18n/ui-translate-segments";
import { translateMlKit } from "@/lib/translate/mlkit-client";
import { localeToMlKit, MlLang } from "@/lib/translate/mlkit-locale";

/** Live copy stays English. On-device translation rewrote "is live", "Idol", and "Tipsy". */
const SKIP_KEY_PREFIXES = ["legal.", "wiki.", "brand.", "m.anime.", "m.live."];

export function uiKeyNeedsMlKit(key: string, targetLocale: Locale): boolean {
  if (targetLocale === "en") return false;
  if (KEEP_ENGLISH_UI_KEYS.has(key)) return false;
  if (SKIP_KEY_PREFIXES.some((p) => key.startsWith(p))) return false;
  return Boolean(localeToMlKit(targetLocale));
}

export async function prefetchUiTranslationModel(targetLocale: Locale): Promise<void> {
  if (targetLocale === "en" || !localeToMlKit(targetLocale)) return;
  // The stock Android module has no downloadModel(). The first batched translate
  // downloads once; a separate warmup call would close the model before that batch.
}

function translateEnglishFragment(text: string, targetLocale: Locale): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return Promise.resolve(text);
  const targetLanguage = localeToMlKit(targetLocale);
  if (!targetLanguage) return Promise.resolve(text);

  const lead = text.match(/^\s*/)?.[0] ?? "";
  const trail = text.match(/\s*$/)?.[0] ?? "";
  return translateMlKit({
    text: trimmed,
    sourceLanguage: MlLang.ENGLISH,
    targetLanguage,
    downloadModelIfNeeded: true,
    requireWifi: true,
  })
    .then((translated) => (translated ? `${lead}${translated}${trail}` : text))
    .catch(() => text);
}

export async function translateUiEnglishString(
  english: string,
  targetLocale: Locale
): Promise<string> {
  if (!english.trim() || targetLocale === "en") return english;
  if (!localeToMlKit(targetLocale)) return english;

  const segments = splitUiTranslatableSegments(english);
  const translatedParts = new Map<number, string>();
  const pending: Array<Promise<void>> = [];
  let textIndex = 0;
  for (const segment of segments) {
    if (segment.kind !== "text") continue;
    const index = textIndex;
    textIndex += 1;
    if (!segment.value.trim()) continue;
    pending.push(
      translateEnglishFragment(segment.value, targetLocale).then((translated) => {
        translatedParts.set(index, translated);
      })
    );
  }
  await Promise.all(pending);
  return joinUiTranslatedSegments(segments, translatedParts);
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
      void mergeUiKeyTable(targetLocale, { [key]: translated }, appVersion);
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
