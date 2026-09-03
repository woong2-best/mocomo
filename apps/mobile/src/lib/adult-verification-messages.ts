export const BIRTH_DATE_REQUIRED_MSG =
  "성인 콘텐츠·유료 기능 이용을 위해 프로필에 생년월일을 등록해 주세요. 허위 정보 기재 시 약관에 따라 계정이 제한될 수 있습니다.";

export const ADULT_VERIFICATION_REQUIRED_MSG =
  "만 19세 이상만 이용할 수 있는 기능입니다. 생년월일이 올바른지 프로필 설정을 확인해 주세요.";

export type AdultVerificationScope = "DM_PAID" | "USED_MARKET" | "LIVE" | "GLOBAL";

export const ADULT_GATED_PAYMENT_TYPES = new Set(["MESSAGE_MEDIA", "CALL_BOOKING"]);

export function paymentTypeRequiresAdultVerification(type: string): boolean {
  return ADULT_GATED_PAYMENT_TYPES.has(type);
}
