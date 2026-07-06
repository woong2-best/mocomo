import type { User } from "@prisma/client";
import {
  isUsedMarketPhoneCountry,
  usedMarketPhoneCountryLabel,
} from "@/lib/used-phone-countries";

export function isUsedMarketEligible(user: Pick<User, "countryCode" | "phoneVerified">): boolean {
  return isUsedMarketPhoneCountry(user.countryCode) && !!user.phoneVerified;
}

export const USED_PHONE_REQUIRED_MSG =
  "중고거래 이용을 위해 휴대폰 번호 인증이 필요합니다.";

export function usedPhoneRequiredMsg(countryCode: string, locale: "ko" | "en" | "ja" | "zh" = "ko") {
  const label = usedMarketPhoneCountryLabel(countryCode, locale);
  if (locale === "en") {
    return `Phone verification is required for the used marketplace (${label} number).`;
  }
  if (locale === "ja") {
    return `フリマ利用には携帯電話番号の認証が必要です（${label}）。`;
  }
  if (locale === "zh") {
    return `使用二手交易需验证手机号（${label}）。`;
  }
  return `중고거래 이용을 위해 휴대폰 번호 인증이 필요합니다. (${label} 번호)`;
}

export function usedMarketUnsupportedCountryMsg(locale: "ko" | "en" | "ja" | "zh" = "ko") {
  if (locale === "en") {
    return "Phone verification for the used marketplace is not available in your country yet.";
  }
  if (locale === "ja") {
    return "お住まいの国ではフリマの電話認証に対応していません。";
  }
  if (locale === "zh") {
    return "您所在的国家/地区暂不支持二手交易手机验证。";
  }
  return "현재 국가에서는 중고거래 휴대폰 인증을 지원하지 않습니다.";
}

/** @deprecated use usedMarketUnsupportedCountryMsg */
export const USED_KR_ONLY_MSG = usedMarketUnsupportedCountryMsg("ko");
