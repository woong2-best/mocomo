export type StressOpResult = {
  ok: boolean;
  ms: number;
  error?: string;
  deadlock?: boolean;
};

export class StressMetrics {
  private latencies: number[] = [];
  errors = 0;
  successes = 0;
  deadlocks = 0;
  rollbacks = 0;

  record(result: StressOpResult) {
    this.latencies.push(result.ms);
    if (result.ok) this.successes += 1;
    else this.errors += 1;
    if (result.deadlock) this.deadlocks += 1;
    if (!result.ok && result.error?.includes("rollback")) this.rollbacks += 1;
  }

  async time<T>(fn: () => Promise<T>): Promise<{ value: T; ms: number }> {
    const start = performance.now();
    const value = await fn();
    return { value, ms: performance.now() - start };
  }

  async run(fn: () => Promise<void>): Promise<void> {
    const start = performance.now();
    try {
      await fn();
      this.record({ ok: true, ms: performance.now() - start });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const deadlock =
        msg.includes("deadlock") ||
        msg.includes("Deadlock") ||
        msg.includes("40P01");
      this.record({ ok: false, ms: performance.now() - start, error: msg, deadlock });
    }
  }

  percentile(p: number): number {
    if (!this.latencies.length) return 0;
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return Math.round(sorted[Math.max(0, idx)]!);
  }

  avgLatency(): number {
    if (!this.latencies.length) return 0;
    return Math.round(this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length);
  }

  tps(durationMs: number): number {
    if (durationMs <= 0) return 0;
    return Math.round((this.successes / durationMs) * 1000 * 10) / 10;
  }

  errorRate(): number {
    const total = this.successes + this.errors;
    if (!total) return 0;
    return Math.round((this.errors / total) * 1000) / 10;
  }

  snapshot(durationMs: number) {
    return {
      tps: this.tps(durationMs),
      p95: this.percentile(95),
      p99: this.percentile(99),
      avgMs: this.avgLatency(),
      errorPct: this.errorRate(),
      deadlocks: this.deadlocks,
      rollbacks: this.rollbacks,
      total: this.successes + this.errors,
      successes: this.successes,
      errors: this.errors,
    };
  }
}

export async function runPool<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<T[]> {
  const results: T[] = [];
  let i = 0;
  async function worker() {
    while (i < tasks.length) {
      const idx = i++;
      results[idx] = await tasks[idx]!();
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export function chaosDelay(maxMs = 30): Promise<void> {
  if (maxMs <= 0) return Promise.resolve();
  const ms = Math.floor(Math.random() * maxMs);
  return new Promise((r) => setTimeout(r, ms));
}
