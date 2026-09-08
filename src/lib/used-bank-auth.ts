import { hasSettlementAccount } from "@/lib/settlement-account";
import { isOfacSanctionedCountry } from "@/lib/compliance/ofac-sanctioned-countries";
import type { Locale } from "@/lib/i18n/config";
import { isKoreaUsedMarketCountry, normalizeUsedMarketCountry } from "@/lib/used-regions-global";

/** 중고거래 이용 자격 — KR: Stripe Connect · 해외: 휴대폰 SMS 인증 */
export function isUsedMarketEligible(user: {
  countryCode: string;
  stripeOnboardingCompleted?: boolean;
  stripeConnectOnboardedAt?: Date | null;
  phoneVerified?: Date | null;
}): boolean {
  const cc = normalizeUsedMarketCountry(user.countryCode);
  if (isOfacSanctionedCountry(cc)) return false;
  if (isKoreaUsedMarketCountry(cc)) {
    return hasSettlementAccount(user);
  }
  return !!user.phoneVerified;
}

export const USED_BANK_REQUIRED_MSG =
  "중고거래 이용을 위해 지갑에서 Stripe Connect 정산 계좌를 연동해 주세요.";

export const USED_PHONE_REQUIRED_MSG =
  "중고거래 이용을 위해 휴대폰 번호 인증을 완료해 주세요.";

/** @deprecated use USED_BANK_REQUIRED_MSG or USED_PHONE_REQUIRED_MSG */
export const USED_PHONE_REQUIRED_MSG_LEGACY = USED_BANK_REQUIRED_MSG;

export function usedBankRequiredMsg(locale: Locale = "ko") {
  if (locale === "en") {
    return "Stripe Connect payout account setup is required for the used marketplace in Korea.";
  }
  if (locale === "ja") {
    return "韓国のフリマ利用にはStripe Connectの精算口座連携が必要です。";
  }
  if (locale === "zh" || locale === "zh-TW") {
    return "在韩国使用二手交易需完成 Stripe Connect 结算账户绑定。";
  }
  if (locale === "ko") return USED_BANK_REQUIRED_MSG;
  return "Stripe Connect payout account setup is required for the used marketplace in Korea.";
}

export function usedPhoneRequiredMsg(locale: Locale = "ko") {
  if (locale === "en") {
    return "Mobile phone verification is required for the used marketplace.";
  }
  if (locale === "ja") {
    return "フリマ利用には携帯電話番号の認証が必要です。";
  }
  if (locale === "zh" || locale === "zh-TW") {
    return "使用二手交易需完成手机号码认证。";
  }
  if (locale === "ko") return USED_PHONE_REQUIRED_MSG;
  return "Mobile phone verification is required for the used marketplace.";
}

export function usedMarketVerificationRequiredMsg(countryCode: string, locale: Locale = "ko") {
  return isKoreaUsedMarketCountry(countryCode)
    ? usedBankRequiredMsg(locale)
    : usedPhoneRequiredMsg(locale);
}

/** @deprecated */
export function usedPhoneRequiredMsgLegacy(_countryCode: string, locale: Locale = "ko") {
  return usedMarketVerificationRequiredMsg(_countryCode, locale);
}

export function usedMarketBlockedRegionMsg(locale: Locale = "ko") {
  if (locale === "en") {
    return "The used marketplace is unavailable in your region.";
  }
  if (locale === "ja") {
    return "お住まいの地域ではフリマをご利用いただけません。";
  }
  if (locale === "zh" || locale === "zh-TW") {
    return "您所在的地区无法使用二手交易。";
  }
  if (locale === "ko") {
    return "해당 지역에서는 중고거래를 이용할 수 없습니다.";
  }
  return "The used marketplace is unavailable in your region.";
}

/** @deprecated — global marketplace; kept for legacy imports */
export function usedMarketUnsupportedCountryMsg(locale: Locale = "ko") {
  return usedMarketBlockedRegionMsg(locale);
}

/** @deprecated */
export const USED_KR_ONLY_MSG = usedMarketBlockedRegionMsg("ko");

/** @deprecated use isUsedMarketEligible */
export function isBankVerifiedForUsed(user: {
  stripeOnboardingCompleted?: boolean;
  stripeConnectOnboardedAt?: Date | null;
  phoneVerified?: Date | null;
  countryCode?: string;
}): boolean {
  if (!user.countryCode) return hasSettlementAccount(user) || !!user.phoneVerified;
  return isUsedMarketEligible({
    countryCode: user.countryCode,
    stripeOnboardingCompleted: user.stripeOnboardingCompleted,
    stripeConnectOnboardedAt: user.stripeConnectOnboardedAt,
    phoneVerified: user.phoneVerified,
  });
}
