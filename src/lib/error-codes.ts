/**
 * Error codes shared by server actions, API routes, the socket server and clients.
 *
 * Servers return the code (an en.json key); clients compare against the code and render
 * with `errorText()`. Never branch on message text.
 */
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

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export function isAuthRequiredError(error: unknown): boolean {
  return error === ERROR_CODES.authRequired;
}

/** Human-check failures where the user should get a fresh question. */
export function isHumanChallengeRetryError(error: unknown): boolean {
  return (
    error === ERROR_CODES.humanChallengeExpired ||
    error === ERROR_CODES.humanChallengeTimeout ||
    error === ERROR_CODES.humanChallengeWrong
  );
}

export function isPhoneVerificationError(error: unknown): boolean {
  return error === ERROR_CODES.usedPhoneVerificationRequired;
}

export function isUsedMarketBannedError(error: unknown): boolean {
  return error === ERROR_CODES.usedMarketBanned;
}
