import { isProviderSkipped, markProviderQuota } from "@/lib/ai-fallback/circuit";
import { isQuotaFailure, quotaReasonCode, type LlmProvider } from "@/lib/ai-fallback/quota";
import { logWorkersAiFallback, workersAiConfigured } from "@/lib/ai-fallback/workers-ai";

export type { LlmProvider } from "@/lib/ai-fallback/quota";
export {
  isProviderSkipped,
  markProviderQuota,
  resetAllProviderSkips,
  resetProviderSkip,
} from "@/lib/ai-fallback/circuit";
export { isQuotaFailure, quotaReasonCode } from "@/lib/ai-fallback/quota";
export {
  logWorkersAiFallback,
  workersAiChat,
  workersAiConfigured,
  workersAiVisionChat,
} from "@/lib/ai-fallback/workers-ai";

export function beginPrimaryOrFallback(
  provider: LlmProvider,
  feature: string
): "primary" | "fallback" | "none" {
  if (isProviderSkipped(provider)) {
    if (!workersAiConfigured()) return "none";
    logWorkersAiFallback({ provider, feature, reason: "provider_skipped", skipped: true });
    return "fallback";
  }
  return "primary";
}

export function fallbackAfterQuota(
  provider: LlmProvider,
  feature: string,
  status: number,
  body = ""
): boolean {
  if (!isQuotaFailure(status, body)) return false;
  markProviderQuota(provider);
  logWorkersAiFallback({
    provider,
    feature,
    reason: quotaReasonCode(status, body),
    status,
  });
  return workersAiConfigured();
}
