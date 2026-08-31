export const ADULT_VERIFICATION_REQUIRED_MSG =
  "미성년자 보호 및 안전한 거래를 위해 최초 1회 본인인증이 필요합니다.";

export type AdultVerificationScope = "DM_PAID" | "USED_MARKET" | "GLOBAL";

export const ADULT_GATED_PAYMENT_TYPES = new Set(["MESSAGE_MEDIA", "CALL_BOOKING"]);

export function paymentTypeRequiresAdultVerification(type: string): boolean {
  return ADULT_GATED_PAYMENT_TYPES.has(type);
}
