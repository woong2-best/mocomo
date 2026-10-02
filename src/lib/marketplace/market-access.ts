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
  getStripeCountryCacheMeta,
} from "@/lib/marketplace/stripe-supported-countries";

export const MARKET_UNAVAILABLE_KO =
  "마켓플레이스는 Stripe 지원 국가에서만 이용할 수 있습니다. 커뮤니티 기능은 계속 이용 가능합니다.";

export const MARKET_UNAVAILABLE_EN =
  "Marketplace is available in Stripe-supported regions only. Community features remain available.";

export const MARKET_STRIPE_DISCLAIMER_KO =
  "Stripe secure checkout · Free seller onboarding · 10% platform fee · Same-country sales only · Sellers handle shipping and logistics.";

export const MARKET_STRIPE_DISCLAIMER_EN =
  "Stripe secure checkout · Free seller onboarding · 10% platform fee · Domestic trades only (same country as seller) · Sellers are responsible for shipping.";

export const MARKET_DOMESTIC_ONLY_KO =
  "Star Market supports transactions only within the seller's country.";

export const MARKET_DOMESTIC_ONLY_EN =
  "Star Market supports domestic trades only — buyer and seller must be in the same country.";

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
      message: "Star Market is not available in this country yet. Used market and community features remain available.",
      messageEn: "Star Market is not available in your country yet. Used market and community remain available.",
    };
  }
  return { message: MARKET_UNAVAILABLE_KO, messageEn: MARKET_UNAVAILABLE_EN };
}

/** Buyer side country for domestic-only trade (ship dest for physical, profile/geo for digital). */
export function resolveDomesticTradeCountry(input: {
  userCountryCode?: string | null;
  shipCountry?: string | null;
  geoCountry?: string | null;
  needsShipping?: boolean;
}): string {
  const { countryCode, shipCountry } = resolveMarketCountry(input);
  if (input.needsShipping && shipCountry) return shipCountry;
  return countryCode;
}

export function assertSameCountryMarketTrade(input: {
  sellerCountryCode: string | null | undefined;
  userCountryCode?: string | null;
  shipCountry?: string | null;
  geoCountry?: string | null;
  needsShipping?: boolean;
}): MarketAccessResult {
  const seller = normalizeSellerCountry(input.sellerCountryCode);
  const buyerSide = normalizeMarketCountry(
    resolveDomesticTradeCountry({
      userCountryCode: input.userCountryCode,
      shipCountry: input.shipCountry,
      geoCountry: input.geoCountry,
      needsShipping: input.needsShipping,
    })
  );

  if (!seller) {
    return {
      allowed: false,
      countryCode: buyerSide,
      message: "Could not verify seller country.",
      messageEn: "Seller country could not be verified.",
    };
  }

  if (buyerSide !== seller) {
    return {
      allowed: false,
      countryCode: buyerSide,
      message: MARKET_DOMESTIC_ONLY_KO,
      messageEn: MARKET_DOMESTIC_ONLY_EN,
    };
  }

  return { allowed: true, countryCode: buyerSide };
}

export function assertMarketAccess(input: {
  userCountryCode?: string | null;
  shipCountry?: string | null;
  geoCountry?: string | null;
  sellerCountryCode?: string | null;
  needsShipping?: boolean;
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
        : "Shipping country must be a Stripe-supported region.",
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
      message: "Marketplace transactions are not supported for this seller's country.",
      messageEn: msg.messageEn,
    };
  }

  if (seller) {
    const domestic = assertSameCountryMarketTrade({
      sellerCountryCode: seller,
      userCountryCode: input.userCountryCode,
      shipCountry: input.shipCountry,
      geoCountry: input.geoCountry,
      needsShipping: input.needsShipping,
    });
    if (!domestic.allowed) return domestic;
  }

  return { allowed: true, countryCode };
}

export function assertMarketAccessFromRequest(input: {
  userCountryCode?: string | null;
  shipCountry?: string | null;
  headers?: Headers;
  sellerCountryCode?: string | null;
  needsShipping?: boolean;
  locale?: "ko" | "en";
}): MarketAccessResult {
  const geo = input.headers ? getRequestCountryFromHeaders(input.headers) : null;
  return assertMarketAccess({
    userCountryCode: input.userCountryCode,
    shipCountry: input.shipCountry,
    geoCountry: geo,
    sellerCountryCode: input.sellerCountryCode,
    needsShipping: input.needsShipping,
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
