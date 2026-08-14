import { isBankVerified } from "@/lib/bank-verification";

/** 중고거래 이용 자격 — 한국 계좌 1원 인증 완료 */
export function isUsedMarketEligible(user: {
  countryCode: string;
  bankVerifiedAt?: Date | null;
  phoneVerified?: Date | null;
}): boolean {
  return user.countryCode.toUpperCase() === "KR" && isBankVerified(user);
}

export const USED_BANK_REQUIRED_MSG =
  "중고거래 이용을 위해 본인 명의 계좌 1원 인증이 필요합니다.";

/** @deprecated use USED_BANK_REQUIRED_MSG */
export const USED_PHONE_REQUIRED_MSG = USED_BANK_REQUIRED_MSG;

export function usedBankRequiredMsg(locale: "ko" | "en" | "ja" | "zh" = "ko") {
  if (locale === "en") {
    return "Bank account verification (1 KRW deposit) is required for the used marketplace.";
  }
  if (locale === "ja") {
    return "フリマ利用には本人名義口座の1ウォン認証が必要です。";
  }
  if (locale === "zh") {
    return "使用二手交易需完成本人银行账户1韩元认证。";
  }
  return USED_BANK_REQUIRED_MSG;
}

/** @deprecated */
export function usedPhoneRequiredMsg(
  _countryCode: string,
  locale: "ko" | "en" | "ja" | "zh" = "ko"
) {
  return usedBankRequiredMsg(locale);
}

export function usedMarketUnsupportedCountryMsg(locale: "ko" | "en" | "ja" | "zh" = "ko") {
  if (locale === "en") {
    return "The used marketplace with bank verification is available in Korea (KR) only.";
  }
  if (locale === "ja") {
    return "口座認証付きフリマは韓国(KR)のみ対応しています。";
  }
  if (locale === "zh") {
    return "带银行账户认证的二手交易目前仅支持韩国(KR)。";
  }
  return "중고거래 계좌 인증은 현재 한국(KR)만 지원합니다.";
}

/** @deprecated */
export const USED_KR_ONLY_MSG = usedMarketUnsupportedCountryMsg("ko");
