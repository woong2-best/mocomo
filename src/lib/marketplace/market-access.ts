/**
 * 마켓플레이스 접근 — Stripe 지원 국가만 허용.
 * Stripe 미지원 국가(KR 등)는 커뮤니티는 이용 가능, 마켓/결제는 차단.
 */

import { getRequestCountryFromHeaders } from "@/lib/compliance/request-country";
import { isOfacSanctionedCountry } from "@/lib/compliance/ofac-sanctioned-countries";
import { normalizeSellerCountry } from "@/lib/marketplace/seller-region-policy";
import { MARKETPLACE_PLATFORM_FEE_BPS } from "@/lib/marketplace/constants";

/** Stripe Connect · Checkout 지원 마켓 국가 (ISO 3166-1 alpha-2) */
export const STRIPE_MARKET_COUNTRIES = new Set([
  "US",
  "CA",
  "GB",
  "DE",
  "FR",
  "IT",
  "ES",
  "NL",
  "BE",
  "AT",
  "CH",
  "IE",
  "PT",
  "FI",
  "SE",
  "NO",
  "DK",
  "PL",
  "CZ",
  "SK",
  "HU",
  "RO",
  "BG",
  "HR",
  "SI",
  "LT",
  "LV",
  "EE",
  "LU",
  "MT",
  "CY",
  "GR",
  "AU",
  "NZ",
  "SG",
  "HK",
  "JP",
  "MX",
  "BR",
  "AE",
  "IL",
  "IN",
  "MY",
  "TH",
  "PH",
  "TW",
]);

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

export function isStripeMarketCountry(countryCode: string | null | undefined): boolean {
  const c = normalizeMarketCountry(countryCode);
  if (!c || isOfacSanctionedCountry(c)) return false;
  return STRIPE_MARKET_COUNTRIES.has(c);
}

export type MarketAccessResult =
  | { allowed: true; countryCode: string }
  | { allowed: false; countryCode: string; message: string; messageEn: string };

export function resolveMarketCountry(input: {
  userCountryCode?: string | null;
  shipCountry?: string | null;
  geoCountry?: string | null;
  /** Buyer checkout: ship country must also be eligible when provided */
  requireShipCountry?: boolean;
}): { countryCode: string; shipCountry?: string } {
  const user = normalizeMarketCountry(input.userCountryCode);
  const ship = normalizeMarketCountry(input.shipCountry);
  const geo = normalizeMarketCountry(input.geoCountry);
  const countryCode = user || ship || geo || "US";
  return { countryCode, shipCountry: ship || undefined };
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
    return {
      allowed: false,
      countryCode,
      message: MARKET_UNAVAILABLE_KO,
      messageEn: MARKET_UNAVAILABLE_EN,
    };
  }

  if (shipCountry && !isStripeMarketCountry(shipCountry)) {
    return {
      allowed: false,
      countryCode: shipCountry,
      message: "배송지 국가는 Stripe 지원 지역이어야 합니다.",
      messageEn: "Shipping country must be in a Stripe-supported region.",
    };
  }

  const seller = input.sellerCountryCode
    ? normalizeSellerCountry(input.sellerCountryCode)
    : null;
  if (seller && !isStripeMarketCountry(seller)) {
    return {
      allowed: false,
      countryCode: seller,
      message: "해당 판매자 국가에서는 마켓 거래를 지원하지 않습니다.",
      messageEn: "Marketplace transactions are not supported for this seller region.",
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

export const STRIPE_MARKET_COUNTRY_LIST = [...STRIPE_MARKET_COUNTRIES].sort();
