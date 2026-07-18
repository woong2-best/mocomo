/** 판매자 국가별 인증 정책 (글로벌 Marketplace) */

export function normalizeSellerCountry(code: string | null | undefined): string {
  return (code ?? "KR").trim().toUpperCase();
}

/** 한국 판매자 — 이메일 + SMS + KYC + 정산 */
export function isKrSellerCountry(countryCode: string | null | undefined): boolean {
  return normalizeSellerCountry(countryCode) === "KR";
}

/** 한국만 휴대폰(SMS) 인증 필수. 해외는 Twilio 없이도 가입 가능 */
export function sellerRequiresPhoneVerification(
  countryCode: string | null | undefined
): boolean {
  return isKrSellerCountry(countryCode);
}

export function sellerPhoneOptionalMessage(locale: "ko" | "en" = "ko"): string {
  if (locale === "en") {
    return "Phone SMS verification is required for Korea only. Overseas sellers continue with email + KYC.";
  }
  return "휴대폰(SMS) 인증은 한국(KR) 판매자만 필수입니다. 해외 판매자는 이메일·KYC·정산으로 가입합니다.";
}
