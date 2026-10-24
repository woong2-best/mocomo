import type { LlmProvider } from "@/lib/ai-fallback/quota";

const DEFAULT_SKIP_MS = 10 * 60 * 1000;
const skipUntil = new Map<LlmProvider, number>();

export function providerSkipMs(): number {
  const raw = Number(process.env.CF_AI_SKIP_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_SKIP_MS;
}

export function isProviderSkipped(provider: LlmProvider, now = Date.now()): boolean {
  return (skipUntil.get(provider) ?? 0) > now;
}

export function markProviderQuota(provider: LlmProvider, now = Date.now()): number {
  const ms = providerSkipMs();
  skipUntil.set(provider, now + ms);
  return ms;
}

export function resetProviderSkip(provider: LlmProvider): void {
  skipUntil.delete(provider);
}

export function resetAllProviderSkips(): void {
  skipUntil.clear();
}
