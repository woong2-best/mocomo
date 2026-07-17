/** MoCoMo MARKET 판매자 휴대폰 인증 지원 국가 */
export const SELLER_PHONE_COUNTRIES = [
  { code: "CN", dial: "+86", labelKo: "중국", labelEn: "China" },
  { code: "HK", dial: "+852", labelKo: "홍콩", labelEn: "Hong Kong" },
  { code: "KR", dial: "+82", labelKo: "한국", labelEn: "Korea" },
  { code: "JP", dial: "+81", labelKo: "일본", labelEn: "Japan" },
  { code: "US", dial: "+1", labelKo: "미국", labelEn: "USA" },
] as const;

export type SellerPhoneCountryCode = (typeof SELLER_PHONE_COUNTRIES)[number]["code"];

const CODE_SET = new Set<string>(SELLER_PHONE_COUNTRIES.map((c) => c.code));

export function isSellerPhoneCountry(code: string): code is SellerPhoneCountryCode {
  return CODE_SET.has(code.toUpperCase());
}

export function sellerPhoneCountryLabel(code: string, locale: "ko" | "en" = "ko"): string {
  const row = SELLER_PHONE_COUNTRIES.find((c) => c.code === code.toUpperCase());
  if (!row) return code;
  return locale === "en" ? row.labelEn : row.labelKo;
}

export function sellerPhoneDialLabel(code: string): string {
  const row = SELLER_PHONE_COUNTRIES.find((c) => c.code === code.toUpperCase());
  if (!row) return code;
  return `${row.code} ${row.dial}`;
}
