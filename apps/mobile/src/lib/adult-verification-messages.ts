/** i18n keys — resolve with translate() at display time. */

export const BIRTH_DATE_REQUIRED_MSG = "m.lib.adult_birth_date_required";

export const ADULT_VERIFICATION_REQUIRED_MSG = "m.lib.adult_verification_required";

export type AdultVerificationScope = "DM_PAID" | "USED_MARKET" | "LIVE" | "GLOBAL";

export const ADULT_GATED_PAYMENT_TYPES = new Set(["MESSAGE_MEDIA", "CALL_BOOKING"]);

export function paymentTypeRequiresAdultVerification(type: string): boolean {
  return ADULT_GATED_PAYMENT_TYPES.has(type);
}
