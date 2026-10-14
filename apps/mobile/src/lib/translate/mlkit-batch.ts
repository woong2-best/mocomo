/** Short UI lines share one on-device call. Long posts stay alone. */
export const MLKIT_BATCH_MAX_LINES = 20;
export const MLKIT_BATCH_MAX_CHARS = 1200;
export const MLKIT_BATCH_LINE_MAX = 180;

export function canBatchMlKitLine(text: string): boolean {
  return text.length > 0 && text.length <= MLKIT_BATCH_LINE_MAX && !text.includes("\n");
}

/** Prefix of `pending` that can share one translate() call. */
export function planMlKitBatch<T extends { text: string }>(pending: readonly T[]): T[] {
  if (pending.length === 0) return [];
  const first = pending[0];
  if (!first || !canBatchMlKitLine(first.text)) return pending.slice(0, 1);

  const batch: T[] = [];
  let chars = 0;
  for (const item of pending) {
    if (!canBatchMlKitLine(item.text)) break;
    if (batch.length >= MLKIT_BATCH_MAX_LINES) break;
    const nextChars = chars + item.text.length + (batch.length > 0 ? 1 : 0);
    if (batch.length > 0 && nextChars > MLKIT_BATCH_MAX_CHARS) break;
    batch.push(item);
    chars = nextChars;
  }
  return batch;
}

/**
 * ML Kit keeps newlines for a list of short independent lines.
 * A different line count means the model merged or split sentences — caller must retry alone.
 */
export function splitBatchedTranslation(expected: number, translated: string): string[] | null {
  if (expected < 2) return null;
  const lines = translated.split("\n");
  if (lines.length !== expected) return null;
  if (lines.some((line) => !line.trim())) return null;
  return lines.map((line) => line.trim());
}
