import test from "node:test";
import assert from "node:assert/strict";
import {
  beginPrimaryOrFallback,
  fallbackAfterQuota,
  isProviderSkipped,
  isQuotaFailure,
  quotaReasonCode,
  resetAllProviderSkips,
} from "@/lib/ai-fallback";

test("quota detector catches rate and billing, not a bad key", () => {
  assert.equal(isQuotaFailure(429), true);
  assert.equal(isQuotaFailure(402), true);
  assert.equal(isQuotaFailure(403, "PERMISSION_DENIED: API key not valid"), false);
  assert.equal(isQuotaFailure(403, "RESOURCE_EXHAUSTED: quota exceeded"), true);
  assert.equal(isQuotaFailure(400, "insufficient_quota"), true);
  assert.equal(quotaReasonCode(429), "http_429");
  assert.equal(quotaReasonCode(403, "RESOURCE_EXHAUSTED"), "resource_exhausted");
});

test("one quota miss skips that provider until the window ends", () => {
  resetAllProviderSkips();
  const prevAccount = process.env.CF_ACCOUNT_ID;
  const prevToken = process.env.CF_API_TOKEN;
  process.env.CF_ACCOUNT_ID = "acct";
  process.env.CF_API_TOKEN = "token";
  try {
    assert.equal(beginPrimaryOrFallback("gemini", "test"), "primary");
    assert.equal(fallbackAfterQuota("gemini", "test", 429), true);
    assert.equal(isProviderSkipped("gemini"), true);
    assert.equal(isProviderSkipped("groq"), false);
    assert.equal(beginPrimaryOrFallback("gemini", "test"), "fallback");
    assert.equal(beginPrimaryOrFallback("openai", "test"), "primary");
    assert.equal(fallbackAfterQuota("gemini", "test", 403, "invalid key"), false);
  } finally {
    resetAllProviderSkips();
    if (prevAccount == null) delete process.env.CF_ACCOUNT_ID;
    else process.env.CF_ACCOUNT_ID = prevAccount;
    if (prevToken == null) delete process.env.CF_API_TOKEN;
    else process.env.CF_API_TOKEN = prevToken;
  }
});
