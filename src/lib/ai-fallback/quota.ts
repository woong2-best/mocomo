export type LlmProvider = "gemini" | "groq" | "openai";

const QUOTA_BODY =
  /resource_exhausted|insufficient_quota|quota[_\s-]?exceeded|rate[_\s-]?limit(?:ed)?|token[_\s-]?limit|exceeded your current quota|billing_hard_limit|out of tokens/i;

export function isQuotaHttpStatus(status: number): boolean {
  return status === 429 || status === 402;
}

export function isQuotaErrorBody(body: string): boolean {
  return Boolean(body) && QUOTA_BODY.test(body);
}

export function isQuotaFailure(status: number, body = ""): boolean {
  return isQuotaHttpStatus(status) || isQuotaErrorBody(body);
}

/** Short machine reason only. Never pass user/chat text in here. */
export function quotaReasonCode(status: number, body = ""): string {
  if (status === 429) return "http_429";
  if (status === 402) return "http_402";
  if (/resource_exhausted/i.test(body)) return "resource_exhausted";
  if (/insufficient_quota/i.test(body)) return "insufficient_quota";
  if (/rate[_\s-]?limit/i.test(body)) return "rate_limit";
  if (/quota/i.test(body)) return "quota";
  return "quota_signal";
}
