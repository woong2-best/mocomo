import { canBatchMlKitLine, planMlKitBatch, splitBatchedTranslation } from "@/lib/translate/mlkit-batch";
import type { TranslateLanguage } from "@/lib/translate/mlkit-locale";

type TranslateTextModule = {
  translate?: (opts: Record<string, unknown>) => Promise<unknown>;
};

export type MlKitTranslateRequest = {
  text: string;
  sourceLanguage: TranslateLanguage;
  targetLanguage: TranslateLanguage;
  downloadModelIfNeeded?: boolean;
  requireWifi?: boolean;
};

type Job = MlKitTranslateRequest & {
  resolve: (text: string) => void;
  reject: (error: unknown) => void;
};

const queues = new Map<string, Job[]>();
const running = new Set<string>();
const batchingDisabled = new Set<string>();
const batchMismatches = new Map<string, number>();

let modulePromise: Promise<TranslateTextModule | null> | null = null;

function loadTranslateText(): Promise<TranslateTextModule | null> {
  if (!modulePromise) {
    modulePromise = import("@react-native-ml-kit/translate-text")
      .then((mod) => mod.default as unknown as TranslateTextModule)
      .catch(() => null);
  }
  return modulePromise;
}

function pairKey(source: string, target: string): string {
  return `${source}>${target}`;
}

function asTranslated(result: unknown, fallback: string): string {
  return typeof result === "string" && result.trim() ? result.trim() : fallback;
}

/**
 * One in-flight native call per language pair.
 *
 * Android `Translation.getClient()` is a single shared translator, and the stock
 * module closes it when the call returns. Two overlapping calls unload the model
 * mid-flight, then every following string pays for a reload.
 */
export function translateMlKit(request: MlKitTranslateRequest): Promise<string> {
  const text = request.text;
  if (!text.trim()) return Promise.resolve(text);

  return new Promise<string>((resolve, reject) => {
    const key = pairKey(request.sourceLanguage, request.targetLanguage);
    const queue = queues.get(key) ?? [];
    queue.push({ ...request, text, resolve, reject });
    queues.set(key, queue);
    kick(key);
  });
}

const schedule =
  typeof queueMicrotask === "function"
    ? queueMicrotask
    : (fn: () => void) => {
        setTimeout(fn, 0);
      };

function kick(key: string): void {
  if (running.has(key)) return;
  running.add(key);
  schedule(() => {
    void drain(key);
  });
}

async function drain(key: string): Promise<void> {
  try {
    while (true) {
      const queue = queues.get(key);
      if (!queue?.length) return;
      const first = queue[0];
      if (!first) return;
      const wifi = first.requireWifi === true;
      const compatible: Job[] = [];
      for (const job of queue) {
        if ((job.requireWifi === true) !== wifi) break;
        compatible.push(job);
      }
      const planned = batchingDisabled.has(key) ? compatible.slice(0, 1) : planMlKitBatch(compatible);
      if (!planned.length) return;
      queue.splice(0, planned.length);
      await runBatch(key, planned);
    }
  } finally {
    running.delete(key);
    if (queues.get(key)?.length) kick(key);
  }
}

async function runNative(
  TranslateText: TranslateTextModule,
  key: string,
  text: string,
  downloadModelIfNeeded: boolean,
  requireWifi: boolean
): Promise<string> {
  const [sourceLanguage, targetLanguage] = key.split(">");
  if (!TranslateText.translate || !sourceLanguage || !targetLanguage) return text;
  const result = await TranslateText.translate({
    text,
    sourceLanguage,
    targetLanguage,
    downloadModelIfNeeded,
    requireWifi,
  });
  return asTranslated(result, text);
}

async function runBatch(key: string, batch: Job[]): Promise<void> {
  const downloadModelIfNeeded = batch.some((job) => job.downloadModelIfNeeded !== false);
  const requireWifi = batch.some((job) => job.requireWifi === true);
  const TranslateText = await loadTranslateText();

  if (!TranslateText?.translate) {
    for (const job of batch) job.resolve(job.text);
    return;
  }

  const batchable =
    !batchingDisabled.has(key) && batch.length > 1 && batch.every((job) => canBatchMlKitLine(job.text));

  try {
    if (!batchable) {
      const only = batch[0];
      if (!only) return;
      only.resolve(await runNative(TranslateText, key, only.text, downloadModelIfNeeded, requireWifi));
      return;
    }

    const joined = batch.map((job) => job.text).join("\n");
    const translated = await runNative(TranslateText, key, joined, downloadModelIfNeeded, requireWifi);
    const lines = splitBatchedTranslation(batch.length, translated);
    if (!lines) {
      const misses = (batchMismatches.get(key) ?? 0) + 1;
      batchMismatches.set(key, misses);
      if (misses >= 2) batchingDisabled.add(key);
      for (const job of batch) {
        job.resolve(await runNative(TranslateText, key, job.text, downloadModelIfNeeded, requireWifi));
      }
      return;
    }

    batchMismatches.set(key, 0);
    batch.forEach((job, index) => {
      job.resolve(lines[index] || job.text);
    });
  } catch (error) {
    for (const job of batch) job.reject(error);
  }
}
