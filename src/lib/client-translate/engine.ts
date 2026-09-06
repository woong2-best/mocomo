import type { Locale } from "@/lib/i18n/config";
import { getCachedTranslation, setCachedTranslation } from "@/lib/client-translate/cache";
import { detectSourceNllb } from "@/lib/client-translate/detect-source";
import { localeToNllb, nllbToLocale, type NllbCode } from "@/lib/client-translate/nllb-codes";
import {
  joinTranslatedSegments,
  splitTranslatableSegments,
} from "@/lib/client-translate/preserve-segments";
import { enqueueTranslation } from "@/lib/client-translate/queue";

export const CLIENT_TRANSLATE_MODEL = "Xenova/nllb-200-distilled-600M";
export const MAX_TRANSLATE_CHARS = 2000;
const CHUNK_CHARS = 380;

type TranslationPipeline = (
  text: string,
  options: { src_lang: NllbCode; tgt_lang: NllbCode }
) => Promise<{ translation_text: string }[]>;

type ProgressCallback = (progress: { status: string; progress?: number }) => void;

let pipelinePromise: Promise<TranslationPipeline> | null = null;
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

async function createPipeline(): Promise<TranslationPipeline> {
  if (typeof window === "undefined") {
    throw new Error("Client translation is browser-only");
  }

  loadStatus = "loading";
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

  try {
    const translator = await pipeline("translation", CLIENT_TRANSLATE_MODEL, {
      device,
      progress_callback: (event: { status?: string; progress?: number }) => {
        if (typeof event.progress === "number") {
          loadProgress = Math.round(event.progress);
          notifyProgress({ status: "loading", progress: loadProgress });
        }
      },
    });
    loadStatus = "ready";
    loadProgress = 100;
    notifyProgress({ status: loadStatus, progress: loadProgress });
    return translator as TranslationPipeline;
  } catch (webgpuError) {
    if (device === "webgpu") {
      const translator = await pipeline("translation", CLIENT_TRANSLATE_MODEL, {
        device: "wasm",
        progress_callback: (event: { status?: string; progress?: number }) => {
          if (typeof event.progress === "number") {
            loadProgress = Math.round(event.progress);
            notifyProgress({ status: "loading", progress: loadProgress });
          }
        },
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

export function warmClientTranslationModel(): Promise<TranslationPipeline> {
  if (!pipelinePromise) {
    pipelinePromise = createPipeline();
  }
  return pipelinePromise;
}

async function getPipeline(): Promise<TranslationPipeline> {
  return warmClientTranslationModel();
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

  const output = await translator(text, { src_lang: srcLang, tgt_lang: tgtLang });
  const translated = output[0]?.translation_text?.trim() ?? text;
  setCachedTranslation(srcLang, tgtLang, text, translated);
  return translated;
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
  if (!trimmed) return null;

  const slice = trimmed.length > MAX_TRANSLATE_CHARS ? trimmed.slice(0, MAX_TRANSLATE_CHARS) : trimmed;
  const sourceNllb = detectSourceNllb(slice);
  const targetNllb = localeToNllb(targetLocale);
  if (!sourceNllb || sourceNllb === targetNllb) return null;

  return enqueueTranslation(async () => {
    const translator = await getPipeline();
    const segments = splitTranslatableSegments(slice);
    const translatedParts = new Map<number, string>();
    let textIndex = 0;

    for (const segment of segments) {
      if (segment.kind !== "text") continue;
      if (!segment.value.trim()) {
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
      sourceLang: nllbToLocale(sourceNllb),
      sourceNllb,
    };
  });
}
