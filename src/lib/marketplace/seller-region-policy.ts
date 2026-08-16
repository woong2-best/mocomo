/** 판매자 국가별 인증 정책 (글로벌 Marketplace) */

export function normalizeSellerCountry(code: string | null | undefined): string {
  return (code ?? "KR").trim().toUpperCase();
}

/** 한국 판매자 — 이메일 + 계좌 1원 인증 + KYC + 정산 */
export function isKrSellerCountry(countryCode: string | null | undefined): boolean {
  return normalizeSellerCountry(countryCode) === "KR";
}

/** 한국만 Apick 1원 계좌 인증 필수. 해외는 Stripe Connect KYC로 진행 */
export function sellerRequiresPhoneVerification(
  countryCode: string | null | undefined
): boolean {
  return isKrSellerCountry(countryCode);
}

export function sellerPhoneOptionalMessage(locale: "ko" | "en" = "ko"): string {
  if (locale === "en") {
    return "Bank account verification (1 KRW) is required for Korea only. Overseas sellers continue with email + Stripe Connect.";
  }
  return "계좌 1원 인증은 한국(KR) 판매자만 필수입니다. 해외 판매자는 이메일·Stripe Connect·KYC로 가입합니다.";
}
