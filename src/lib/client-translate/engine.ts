import type { Locale } from "@/lib/i18n/config";
import { getCachedTranslation, setCachedTranslation } from "@/lib/client-translate/cache";
import { detectSourceNllb } from "@/lib/client-translate/detect-source";
import { localeToNllb, nllbToLocale, type NllbCode } from "@/lib/client-translate/nllb-codes";
import {
  joinTranslatedSegments,
  splitTranslatableSegments,
} from "@/lib/client-translate/preserve-segments";
import { enqueueTranslation } from "@/lib/client-translate/queue";
import { isTextWorthTranslating } from "@/lib/translate-text-filter";

/** Helsinki-NLP Opus-MT via Transformers.js ONNX. Pair models are resolved at runtime. */
export const CLIENT_TRANSLATE_MODEL = "Helsinki-NLP/Opus-MT";
export const MAX_TRANSLATE_CHARS = 2000;
const CHUNK_CHARS = 380;

const OPUS_MUL_EN = "Xenova/opus-mt-mul-en";

/** Direct Opus-MT pair models hosted as Xenova ONNX. */
const OPUS_PAIR_MODELS: Record<string, string> = {
  "ko:en": "Xenova/opus-mt-ko-en",
  "ja:en": "Xenova/opus-mt-ja-en",
  "zh:en": "Xenova/opus-mt-zh-en",
  "zh-TW:en": "Xenova/opus-mt-zh-en",
};

type TranslationPipeline = (text: string) => Promise<{ translation_text: string }[]>;

type ProgressCallback = (progress: { status: string; progress?: number }) => void;

const pipelinePromises = new Map<string, Promise<TranslationPipeline>>();
let loadProgress = 0;
let loadStatus: "idle" | "loading" | "ready" | "error" = "idle";
const progressListeners = new Set<ProgressCallback>();

function notifyProgress(update: { status: string; progress?: number }): void {
  for (const listener of progressListeners) listener(update);
}

export function subscribeTranslationLoad(cb: ProgressCallback): () => void {
  progressListeners.add(cb);
  cb({ status: loadStatus, progress: loadProgress });
  return () => progressListeners.delete(cb);
}

export function getTranslationLoadState(): { status: typeof loadStatus; progress: number } {
  return { status: loadStatus, progress: loadProgress };
}

function resolveOpusModel(sourceLocale: Locale | null, targetLocale: Locale): string | null {
  if (sourceLocale && sourceLocale === targetLocale) return null;
  if (sourceLocale) {
    const pair = OPUS_PAIR_MODELS[`${sourceLocale}:${targetLocale}`];
    if (pair) return pair;
  }
  if (targetLocale === "en") return OPUS_MUL_EN;
  return null;
}

async function createPipeline(modelId: string): Promise<TranslationPipeline> {
  if (typeof window === "undefined") {
    throw new Error("Client translation is browser-only");
  }

  loadStatus = "loading";
  loadProgress = 0;
  notifyProgress({ status: loadStatus, progress: 0 });

  const { pipeline, env } = await import("@huggingface/transformers");
  env.allowLocalModels = false;
  env.useBrowserCache = true;

  let device: "webgpu" | "wasm" = "wasm";
  if (typeof navigator !== "undefined" && "gpu" in navigator) {
    try {
      const nav = navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } };
      const gpu = await nav.gpu?.requestAdapter();
      if (gpu) device = "webgpu";
    } catch {
      device = "wasm";
    }
  }

  const loadOptions = {
    device,
    progress_callback: (event: { status?: string; progress?: number }) => {
      if (typeof event.progress === "number") {
        loadProgress = Math.round(event.progress);
        notifyProgress({ status: "loading", progress: loadProgress });
      }
    },
  };

  try {
    const translator = await pipeline("translation", modelId, loadOptions);
    loadStatus = "ready";
    loadProgress = 100;
    notifyProgress({ status: loadStatus, progress: loadProgress });
    return translator as TranslationPipeline;
  } catch (webgpuError) {
    if (device === "webgpu") {
      const translator = await pipeline("translation", modelId, {
        ...loadOptions,
        device: "wasm",
      });
      loadStatus = "ready";
      loadProgress = 100;
      notifyProgress({ status: loadStatus, progress: loadProgress });
      return translator as TranslationPipeline;
    }
    loadStatus = "error";
    notifyProgress({ status: loadStatus });
    throw webgpuError;
  }
}

function getPipeline(modelId: string): Promise<TranslationPipeline> {
  let pending = pipelinePromises.get(modelId);
  if (!pending) {
    pending = createPipeline(modelId).catch((error) => {
      pipelinePromises.delete(modelId);
      throw error;
    });
    pipelinePromises.set(modelId, pending);
  }
  return pending;
}

/** Warmup keeps the existing provider loop from retrying; pair models load on first post. */
export async function warmClientTranslationModel(): Promise<void> {
  if (typeof window === "undefined") return;
  if (loadStatus !== "idle") return;
  loadStatus = "ready";
  notifyProgress({ status: loadStatus, progress: 0 });
}

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
  translator: TranslationPipeline,
  text: string,
  srcLang: NllbCode,
  tgtLang: NllbCode
): Promise<string> {
  const cached = getCachedTranslation(srcLang, tgtLang, text);
  if (cached) return cached;

  const output = await translator(text);
  const translated = Array.isArray(output)
    ? output[0]?.translation_text?.trim()
    : (output as { translation_text?: string } | undefined)?.translation_text?.trim();
  const result = translated || text;
  setCachedTranslation(srcLang, tgtLang, text, result);
  return result;
}

async function translatePlainText(
  translator: TranslationPipeline,
  text: string,
  srcLang: NllbCode,
  tgtLang: NllbCode
): Promise<string> {
  if (!text.trim()) return text;
  const chunks = chunkText(text);
  const parts: string[] = [];
  for (const chunk of chunks) {
    parts.push(await translateChunk(translator, chunk, srcLang, tgtLang));
  }
  return parts.join(chunks.length > 1 ? "\n" : "");
}

export type ClientTranslateResult = {
  translated: string;
  sourceLang: Locale | null;
  sourceNllb: NllbCode;
};

export async function translateTextClientSide(
  text: string,
  targetLocale: Locale
): Promise<ClientTranslateResult | null> {
  const trimmed = text.trim();
  if (!trimmed || !isTextWorthTranslating(trimmed)) return null;

  const slice = trimmed.length > MAX_TRANSLATE_CHARS ? trimmed.slice(0, MAX_TRANSLATE_CHARS) : trimmed;
  const sourceNllb = detectSourceNllb(slice);
  const targetNllb = localeToNllb(targetLocale);
  if (!sourceNllb || sourceNllb === targetNllb) return null;

  const sourceLang = nllbToLocale(sourceNllb);
  const modelId = resolveOpusModel(sourceLang, targetLocale);
  if (!modelId) return null;

  return enqueueTranslation(async () => {
    const translator = await getPipeline(modelId);
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
        translator,
        segment.value,
        sourceNllb,
        targetNllb
      );
      translatedParts.set(textIndex, translated);
      textIndex += 1;
    }

    const translated = joinTranslatedSegments(segments, translatedParts);
    return {
      translated,
      sourceLang,
      sourceNllb,
    };
  });
}
