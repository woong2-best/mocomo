import { EN_MESSAGES } from "@/i18n/messages";
import { translate } from "@/i18n/runtime";

/**
 * Server error contract: `{ error: "<english fallback>", code?: "<catalog key>" }`.
 * The app compares against `code` (never against message text) and renders it with t().
 */

/** Mirror of the server's `ERROR_CODES` (src/lib/error-codes.ts) for codes the app branches on. */
export const ERROR_CODES = {
  authRequired: "common.error.authRequired",
  humanChallengeMissing: "auth.humanChallenge.missing",
  humanChallengeExpired: "auth.humanChallenge.expired",
  humanChallengeTimeout: "auth.humanChallenge.timeout",
  humanChallengeWrong: "auth.humanChallenge.wrong",
  usedPhoneVerificationRequired: "used.error.phoneVerificationRequired",
  usedMarketBanned: "used.error.marketBanned",
  usedRegionUnavailable: "used.error.regionUnavailable",
} as const;

/** Catalog code carried by an API error body, if the body has one the app knows. */
export function errorCodeOfBody(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const { code, error } = body as { code?: unknown; error?: unknown };
  if (typeof code === "string" && code in EN_MESSAGES) return code;
  // Some routes return the bare code in `error`.
  if (typeof error === "string" && error.includes(".") && error in EN_MESSAGES) return error;
  return null;
}

/**
 * Normalize a parsed error body so existing `body.error` readers get localized text:
 * known codes are rendered through the runtime translator.
 */
export function localizeErrorBody(parsed: unknown): { body: unknown; message: string | null } {
  const code = errorCodeOfBody(parsed);
  if (code) {
    const message = translate(code);
    return { body: { ...(parsed as object), code, error: message }, message };
  }
  if (parsed && typeof parsed === "object") {
    const rec = parsed as { message?: unknown; error?: unknown };
    if (typeof rec.message === "string") return { body: parsed, message: rec.message };
    if (typeof rec.error === "string") return { body: parsed, message: rec.error };
  }
  return { body: parsed, message: null };
}
