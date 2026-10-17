import {
  getCachedFullTranslation,
  getCachedFullTranslationAsync,
  getCachedTranslation,
  setCachedFullTranslation,
  setCachedTranslation,
} from "@/lib/client-translate/cache";
import { detectSourceNllb, detectSourceOpusLang } from "@/lib/client-translate/detect-source";
import { type NllbCode } from "@/lib/client-translate/nllb-codes";
import {
  likelyWarmupModel,
  POST_TRANSLATE_OFF,
  resolveOpusModel,
  usesServerPostTranslation,
} from "@/lib/client-translate/opus-mt-pairs";
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

export type ClientTranslateResult = {
  translated: string;
  sourceLang: string | null;
  sourceNllb: NllbCode;
};

export type TranslateTextOptions = {
  priority?: number;
};

type TranslationPipeline = (text: string) => Promise<{ translation_text: string }[]>;

type ProgressCallback = (progress: { status: string; progress?: number }) => void;

const pipelinePromises = new Map<string, Promise<TranslationPipeline>>();
const inflight = new Map<string, Promise<ClientTranslateResult | null>>();
type LoadStatus = "idle" | "loading" | "ready" | "error";

let loadProgress = 0;
let loadStatus: LoadStatus = "idle";
let lastNotifiedStatus: LoadStatus = loadStatus;
let lastNotifiedProgress = loadProgress;
const progressListeners = new Set<ProgressCallback>();

function notifyProgress(update: { status: string; progress?: number }): void {
  const progress = update.progress ?? lastNotifiedProgress;
  if (update.status === lastNotifiedStatus && progress === lastNotifiedProgress) return;
  lastNotifiedStatus = update.status as LoadStatus;
  lastNotifiedProgress = progress;
  for (const listener of progressListeners) listener(update);
}

function isBenignTokenizerWarning(args: unknown[]): boolean {
  const text = args.filter((arg) => typeof arg === "string").join(" ");
  return text.includes("MarianTokenizer") && text.includes("fast");
}

let tokenizerWarnPatched = false;

/** Opus-MT always falls back to the JS tokenizer. The library warns on every load. */
function silenceMarianTokenizerWarning(): void {
  if (tokenizerWarnPatched || typeof console === "undefined") return;
  tokenizerWarnPatched = true;
  const original = console.warn.bind(console);
  console.warn = (...args: unknown[]) => {
    if (isBenignTokenizerWarning(args)) return;
    original(...args);
  };
}

export function subscribeTranslationLoad(cb: ProgressCallback): () => void {
  progressListeners.add(cb);
  cb({ status: loadStatus, progress: loadProgress });
  return () => progressListeners.delete(cb);
}

export function getTranslationLoadState(): { status: typeof loadStatus; progress: number } {
  return { status: loadStatus, progress: loadProgress };
}

function configureWasmBackend(env: {
  backends?: { onnx?: { wasm?: { proxy?: boolean; numThreads?: number } } };
}): void {
  const wasm = env.backends?.onnx?.wasm;
  if (!wasm) return;
  const isolated = typeof crossOriginIsolated !== "undefined" && crossOriginIsolated;
  wasm.proxy = isolated;
  wasm.numThreads = isolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
}

async function resolveDevice(): Promise<"webgpu" | "wasm"> {
  if (typeof navigator === "undefined" || !("gpu" in navigator)) return "wasm";
  try {
    const nav = navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } };
    const gpu = await nav.gpu?.requestAdapter();
    return gpu ? "webgpu" : "wasm";
  } catch {
    return "wasm";
  }
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
  configureWasmBackend(env);

  const device = await resolveDevice();
  const loadOptions = {
    device,
    progress_callback: (event: { status?: string; progress?: number }) => {
      if (typeof event.progress !== "number") return;
      const next = Math.round(event.progress);
      if (loadStatus === "loading" && loadProgress === next) return;
      loadProgress = next;
      notifyProgress({ status: "loading", progress: loadProgress });
    },
  };

  silenceMarianTokenizerWarning();
  try {
    const translator = await pipeline("translation", modelId, loadOptions);
    loadStatus = "ready";
    loadProgress = 100;
    notifyProgress({ status: loadStatus, progress: loadProgress });
    return translator as TranslationPipeline;
  } catch (firstError) {
    if (device === "webgpu") {
      try {
        const translator = await pipeline("translation", modelId, {
          ...loadOptions,
          device: "wasm",
        });
        loadStatus = "ready";
        loadProgress = 100;
        notifyProgress({ status: loadStatus, progress: loadProgress });
        return translator as TranslationPipeline;
      } catch {
        loadStatus = "error";
        notifyProgress({ status: loadStatus });
        throw firstError;
      }
    }
    loadStatus = "error";
    notifyProgress({ status: loadStatus });
    throw firstError;
  }
}

function getPipeline(modelId: string): Promise<TranslationPipeline> {
  let pending = pipelinePromises.get(modelId);
  if (!pending) {
    pending = createPipeline(modelId).catch((error) => {
      pipelinePromises.delete(modelId);
      console.error(
        "[client-translate] model load failed",
        error instanceof Error ? error.message : "error"
      );
      throw error;
    });
    pipelinePromises.set(modelId, pending);
  }
  return pending;
}

type TranslationRequest = {
  slice: string;
  sourceNllb: NllbCode;
  sourceLang: string;
  targetLang: string;
  modelId: string | null;
};

function resolveRequest(text: string, targetLang: string): TranslationRequest | null {
  const trimmed = text.trim();
  if (!trimmed || !isTextWorthTranslating(trimmed)) return null;
  if (!targetLang || targetLang === POST_TRANSLATE_OFF) return null;

  const slice = trimmed.length > MAX_TRANSLATE_CHARS ? trimmed.slice(0, MAX_TRANSLATE_CHARS) : trimmed;
  const sourceNllb = detectSourceNllb(slice);
  const sourceLang = detectSourceOpusLang(slice);
  if (!sourceNllb || !sourceLang || sourceLang === targetLang) return null;

  const modelId = resolveOpusModel(sourceLang, targetLang);
  if (!modelId && !usesServerPostTranslation(targetLang)) return null;
  return { slice, sourceNllb, sourceLang, modelId, targetLang };
}

function resolveJob(text: string, targetLang: string) {
  const request = resolveRequest(text, targetLang);
  if (!request?.modelId) return null;
  return { ...request, modelId: request.modelId };
}

async function readFullCache(request: TranslationRequest): Promise<ClientTranslateResult | null> {
  const cached =
    getCachedFullTranslation(request.sourceNllb, request.targetLang, request.slice) ??
    (await getCachedFullTranslationAsync(request.sourceNllb, request.targetLang, request.slice));
  if (!cached) return null;
  return {
    translated: cached.translated,
    sourceLang: cached.sourceLang ?? request.sourceLang,
    sourceNllb: cached.sourceNllb || request.sourceNllb,
  };
}

/** Korean (and any future server target) has no browser model. Click translates via the API. */
async function translateWithServer(request: TranslationRequest): Promise<ClientTranslateResult | null> {
  const cached = await readFullCache(request);
  if (cached) return cached;

  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: request.slice, targetLocale: request.targetLang }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { ok?: boolean; translated?: string; sourceLang?: string | null };
  const translated = data.translated?.trim();
  if (!data.ok || !translated) return null;

  const result: ClientTranslateResult = {
    translated,
    sourceLang: data.sourceLang ?? request.sourceLang,
    sourceNllb: request.sourceNllb,
  };
  setCachedFullTranslation(request.sourceNllb, request.targetLang, request.slice, result);
  return result;
}

export async function lookupCachedClientTranslation(
  text: string,
  targetLang: string
): Promise<ClientTranslateResult | null> {
  const request = resolveRequest(text, targetLang);
  if (!request) return null;
  return readFullCache(request);
}

export async function prefetchClientTranslationModel(
  text: string,
  targetLang: string
): Promise<void> {
  const job = resolveJob(text, targetLang);
  if (!job) return;
  await getPipeline(job.modelId);
}

/** Preload the JS chunk and the most likely pair model for this viewer. */
export async function warmClientTranslationModel(targetLang?: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (!targetLang || targetLang === POST_TRANSLATE_OFF) return;
  const modelId = likelyWarmupModel(targetLang);
  if (!modelId) return;
  await getPipeline(modelId);
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

export async function translateTextClientSide(
  text: string,
  targetLang: string,
  options: TranslateTextOptions = {}
): Promise<ClientTranslateResult | null> {
  const request = resolveRequest(text, targetLang);
  if (!request) return null;
  if (!request.modelId) {
    const inflightKey = `${request.sourceNllb}:${request.targetLang}:${request.slice}`;
    const existing = inflight.get(inflightKey);
    if (existing) return existing;
    const pending = translateWithServer(request);
    inflight.set(inflightKey, pending);
    try {
      return await pending;
    } finally {
      inflight.delete(inflightKey);
    }
  }

  const job = { ...request, modelId: request.modelId };

  const cached = await lookupCachedClientTranslation(text, targetLang);
  if (cached) return cached;

  const inflightKey = `${job.sourceNllb}:${job.targetLang}:${job.slice}`;
  const existing = inflight.get(inflightKey);
  if (existing) return existing;

  const pending = enqueueTranslation(async () => {
    const fromCache = await lookupCachedClientTranslation(text, targetLang);
    if (fromCache) return fromCache;

    const translator = await getPipeline(job.modelId);
    const segments = splitTranslatableSegments(job.slice);
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
        job.sourceNllb,
        job.targetLang
      );
      translatedParts.set(textIndex, translated);
      textIndex += 1;
    }

    const translated = joinTranslatedSegments(segments, translatedParts);
    const result = {
      translated,
      sourceLang: job.sourceLang,
      sourceNllb: job.sourceNllb,
    };
    setCachedFullTranslation(job.sourceNllb, job.targetLang, job.slice, result);
    return result;
  }, options.priority ?? 1);

  inflight.set(inflightKey, pending);
  try {
    return await pending;
  } finally {
    inflight.delete(inflightKey);
  }
}
