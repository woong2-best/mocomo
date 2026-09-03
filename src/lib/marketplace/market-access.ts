/**
 * 마켓플레이스 접근 — Stripe 지원 국가 ∩ OFAC comprehensive ∩ product policy.
 * Stripe list ↔ OFAC list are maintained independently (see stripe-supported-countries + ofac-*).
 */

import { getRequestCountryFromHeaders } from "@/lib/compliance/request-country";
import { isOfacComprehensiveEmbargoLocation } from "@/lib/compliance/ofac-comprehensive-embargo";
import { normalizeSellerCountry } from "@/lib/marketplace/seller-region-policy";
import { MARKETPLACE_PLATFORM_FEE_BPS } from "@/lib/marketplace/constants";
import {
  getStripeSupportedCountriesSync,
  getStripeSupportedCountryList,
  isCountryInStripeSupportedList,
  isStarMarketProductExcluded,
} from "@/lib/marketplace/stripe-supported-countries";

export {
  getStripeSupportedCountriesSync,
  getStripeSupportedCountryList,
  STAR_MARKET_PRODUCT_EXCLUDED_COUNTRIES,
  syncStripeSupportedCountriesFromApi,
  ensureStripeSupportedCountriesFresh,
  getStripeCountryCacheMeta,
} from "@/lib/marketplace/stripe-supported-countries";

export const MARKET_UNAVAILABLE_KO =
  "마켓플레이스는 Stripe 지원 국가에서만 이용할 수 있습니다. 커뮤니티 기능은 계속 이용 가능합니다.";

export const MARKET_UNAVAILABLE_EN =
  "Marketplace is available in Stripe-supported regions only. Community features remain available.";

export const MARKET_STRIPE_DISCLAIMER_KO =
  "Stripe 안전 결제 · 입점비 무료 · 플랫폼 수수료 10% · 배송·물류 책임은 판매자에게 있습니다.";

export const MARKET_STRIPE_DISCLAIMER_EN =
  "Stripe secure checkout · Free seller onboarding · 10% platform fee · Sellers are responsible for shipping.";

export function normalizeMarketCountry(code: string | null | undefined): string {
  return (code ?? "").trim().toUpperCase();
}

/** @deprecated Use getStripeSupportedCountriesSync() — synced via cron from Stripe API */
export function getStripeMarketCountries(): Set<string> {
  return getStripeSupportedCountriesSync();
}

export function isStripeMarketCountry(countryCode: string | null | undefined): boolean {
  const c = normalizeMarketCountry(countryCode);
  if (!c) return false;
  if (isOfacComprehensiveEmbargoLocation({ countryCode: c })) return false;
  if (isStarMarketProductExcluded(c)) return false;
  return isCountryInStripeSupportedList(c);
}

export type MarketAccessResult =
  | { allowed: true; countryCode: string }
  | { allowed: false; countryCode: string; message: string; messageEn: string };

export function resolveMarketCountry(input: {
  userCountryCode?: string | null;
  shipCountry?: string | null;
  geoCountry?: string | null;
  requireShipCountry?: boolean;
}): { countryCode: string; shipCountry?: string } {
  const user = normalizeMarketCountry(input.userCountryCode);
  const ship = normalizeMarketCountry(input.shipCountry);
  const geo = normalizeMarketCountry(input.geoCountry);
  const countryCode = user || ship || geo || "US";
  return { countryCode, shipCountry: ship || undefined };
}

function marketBlockedMessage(countryCode: string): { message: string; messageEn: string } {
  if (isStarMarketProductExcluded(countryCode)) {
    return {
      message: "Star Market은 현재 해당 국가에서 제공되지 않습니다. 중고·커뮤니티는 이용 가능합니다.",
      messageEn: "Star Market is not available in your country yet. Used market and community remain available.",
    };
  }
  return { message: MARKET_UNAVAILABLE_KO, messageEn: MARKET_UNAVAILABLE_EN };
}

export function assertMarketAccess(input: {
  userCountryCode?: string | null;
  shipCountry?: string | null;
  geoCountry?: string | null;
  sellerCountryCode?: string | null;
  locale?: "ko" | "en";
}): MarketAccessResult {
  const { countryCode, shipCountry } = resolveMarketCountry(input);

  if (!isStripeMarketCountry(countryCode)) {
    const msg = marketBlockedMessage(countryCode);
    return { allowed: false, countryCode, ...msg };
  }

  if (shipCountry && !isStripeMarketCountry(shipCountry)) {
    const msg = marketBlockedMessage(shipCountry);
    return {
      allowed: false,
      countryCode: shipCountry,
      message: msg.message.startsWith("Star")
        ? msg.message
        : "배송지 국가는 Stripe 지원 지역이어야 합니다.",
      messageEn: msg.messageEn.startsWith("Star")
        ? msg.messageEn
        : "Shipping country must be in a Stripe-supported region.",
    };
  }

  const seller = input.sellerCountryCode
    ? normalizeSellerCountry(input.sellerCountryCode)
    : null;
  if (seller && !isStripeMarketCountry(seller)) {
    const msg = marketBlockedMessage(seller);
    return {
      allowed: false,
      countryCode: seller,
      message: "해당 판매자 국가에서는 마켓 거래를 지원하지 않습니다.",
      messageEn: msg.messageEn,
    };
  }

  return { allowed: true, countryCode };
}

export function assertMarketAccessFromRequest(input: {
  userCountryCode?: string | null;
  shipCountry?: string | null;
  headers?: Headers;
  sellerCountryCode?: string | null;
  locale?: "ko" | "en";
}): MarketAccessResult {
  const geo = input.headers ? getRequestCountryFromHeaders(input.headers) : null;
  return assertMarketAccess({
    userCountryCode: input.userCountryCode,
    shipCountry: input.shipCountry,
    geoCountry: geo,
    sellerCountryCode: input.sellerCountryCode,
    locale: input.locale,
  });
}

/** @deprecated Stripe-only — always STRIPE */
export function isStripeSupportedSellerCountry(countryCode: string | null | undefined): boolean {
  return isStripeMarketCountry(normalizeSellerCountry(countryCode));
}

export function marketplacePlatformFeeBps(): number {
  return MARKETPLACE_PLATFORM_FEE_BPS;
}

export const STRIPE_MARKET_COUNTRY_LIST = getStripeSupportedCountryList();

/** @deprecated Use getStripeMarketCountries() */
export const STRIPE_MARKET_COUNTRIES = getStripeSupportedCountriesSync();
