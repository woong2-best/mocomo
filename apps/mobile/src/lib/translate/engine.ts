import TranslateText, { TranslateLanguage } from "@react-native-ml-kit/translate-text";
import type { Locale } from "@/i18n";
import { getCachedTranslation, setCachedTranslation } from "@/lib/translate/cache";
import { detectSourceMlKit } from "@/lib/translate/detect-source";
import { localeToMlKit, mlKitToLocale } from "@/lib/translate/mlkit-locale";
import {
  joinTranslatedSegments,
  splitTranslatableSegments,
} from "@/lib/translate/preserve-segments";
import { enqueueTranslation } from "@/lib/translate/queue";
import { isTextWorthTranslating } from "@/lib/translate/text-filter";

export const MAX_TRANSLATE_CHARS = 2000;
const CHUNK_CHARS = 380;

function chunkText(text: string): string[] {
  const trimmed = text.trim();
  if (trimmed.length <= CHUNK_CHARS) return [trimmed];

  const chunks: string[] = [];
  let rest = trimmed;
  while (rest.length > CHUNK_CHARS) {
    let splitAt = rest.lastIndexOf("\n", CHUNK_CHARS);
    if (splitAt < CHUNK_CHARS * 0.4) splitAt = rest.lastIndexOf(" ", CHUNK_CHARS);
    if (splitAt < CHUNK_CHARS * 0.4) splitAt = CHUNK_CHARS;
    chunks.push(rest.slice(0, splitAt).trim());
    rest = rest.slice(splitAt).trim();
  }
  if (rest) chunks.push(rest);
  return chunks.filter(Boolean);
}

async function translateChunk(
  text: string,
  sourceLanguage: TranslateLanguage,
  targetLanguage: TranslateLanguage
): Promise<string> {
  const cached = await getCachedTranslation(sourceLanguage, targetLanguage, text);
  if (cached) return cached;

  const result = (await TranslateText.translate({
    text,
    sourceLanguage,
    targetLanguage,
    downloadModelIfNeeded: true,
  })) as unknown as string;

  const translated = typeof result === "string" ? result.trim() : text;
  await setCachedTranslation(sourceLanguage, targetLanguage, text, translated);
  return translated;
}

async function translatePlainText(
  text: string,
  sourceLanguage: TranslateLanguage,
  targetLanguage: TranslateLanguage
): Promise<string> {
  if (!text.trim()) return text;
  const chunks = chunkText(text);
  const parts: string[] = [];
  for (const chunk of chunks) {
    parts.push(await translateChunk(chunk, sourceLanguage, targetLanguage));
  }
  return parts.join(chunks.length > 1 ? "\n" : "");
}

export type ClientTranslateResult = {
  translated: string;
  sourceLang: Locale | null;
};

export async function translateTextOnDevice(
  text: string,
  targetLocale: Locale
): Promise<ClientTranslateResult | null> {
  const trimmed = text.trim();
  if (!trimmed || !isTextWorthTranslating(trimmed)) return null;

  const slice = trimmed.length > MAX_TRANSLATE_CHARS ? trimmed.slice(0, MAX_TRANSLATE_CHARS) : trimmed;
  const sourceLanguage = detectSourceMlKit(slice);
  const targetLanguage = localeToMlKit(targetLocale);
  if (!sourceLanguage || !targetLanguage || sourceLanguage === targetLanguage) {
    return null;
  }

  return enqueueTranslation(async () => {
    const segments = splitTranslatableSegments(slice);
    const translatedParts = new Map<number, string>();
    let textIndex = 0;

    for (const segment of segments) {
      if (segment.kind !== "text") continue;
      if (!segment.value.trim()) {
        textIndex += 1;
        continue;
      }
      if (!isTextWorthTranslating(segment.value)) {
        translatedParts.set(textIndex, segment.value);
        textIndex += 1;
        continue;
      }
      const translated = await translatePlainText(
        segment.value,
        sourceLanguage,
        targetLanguage
      );
      translatedParts.set(textIndex, translated);
      textIndex += 1;
    }

    return {
      translated: joinTranslatedSegments(segments, translatedParts),
      sourceLang: mlKitToLocale(sourceLanguage),
    };
  });
}
