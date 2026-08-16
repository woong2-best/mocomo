/**
 * Lightweight perf marks for Phase 3 gate validation on device.
 * Logs in __DEV__ only — no PII.
 */
const marks = new Map<string, number>();

export function perfMark(name: string): void {
  marks.set(name, Date.now());
}

export function perfMeasure(name: string, startName: string): number | null {
  const start = marks.get(startName);
  if (start == null) return null;
  const ms = Date.now() - start;
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[perf] ${name}: ${ms}ms`);
  }
  return ms;
}

export function clearPerfMarks(): void {
  marks.clear();
}
