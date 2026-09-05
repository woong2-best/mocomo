/**
 * Stripe-only marketplace payment routing (Rail B deferred).
 * - Stripe Connect supported countries only for sellers; buyers may purchase from supported regions.
 * - Platform fee 10% via Connect destination charge + manual capture.
 */

import type { MarketplaceCheckoutMode } from "@prisma/client";
import type { Locale } from "@/lib/i18n/config";
import { translate } from "@/lib/i18n/messages";
import {
  computeMarketplaceFees,
  MARKETPLACE_PLATFORM_FEE_BPS,
  type MarketplaceFeeOptions,
} from "@/lib/marketplace/constants";
import {
  assertMarketAccess,
  assertMarketAccessFromRequest,
  isStripeMarketCountry,
  MARKET_STRIPE_DISCLAIMER_EN,
  MARKET_STRIPE_DISCLAIMER_KO,
  MARKET_UNAVAILABLE_EN,
  MARKET_UNAVAILABLE_KO,
  normalizeMarketCountry,
  STRIPE_MARKET_COUNTRIES,
} from "@/lib/marketplace/market-access";

export { STRIPE_MARKET_COUNTRIES, isStripeMarketCountry, assertMarketAccess, assertMarketAccessFromRequest };

/** @deprecated use STRIPE_MARKET_COUNTRIES */
export const STRIPE_CHECKOUT_BUYER_COUNTRIES = STRIPE_MARKET_COUNTRIES;

export type BuyerCountrySource = "user" | "ship" | "geo" | "default";

export type ResolvedBuyerCountry = {
  countryCode: string;
  source: BuyerCountrySource;
};

export type CheckoutRoutingResult = {
  mode: MarketplaceCheckoutMode | "BLOCKED";
  buyerCountry: ResolvedBuyerCountry;
  platformFeeBps: number;
  primaryAction: "stripe_checkout" | "blocked";
  disclaimer: string;
  blockedReason?: string;
};

export function resolveBuyerCountry(input: {
  userCountryCode?: string | null;
  shipCountry?: string | null;
  geoCountry?: string | null;
}): ResolvedBuyerCountry {
  const user = input.userCountryCode?.trim();
  if (user) {
    return { countryCode: normalizeMarketCountry(user), source: "user" };
  }
  const ship = input.shipCountry?.trim();
  if (ship) {
    return { countryCode: normalizeMarketCountry(ship), source: "ship" };
  }
  const geo = input.geoCountry?.trim();
  if (geo) {
    return { countryCode: normalizeMarketCountry(geo), source: "geo" };
  }
  return { countryCode: "US", source: "default" };
}

export function resolveCheckoutRouting(input: {
  userCountryCode?: string | null;
  shipCountry?: string | null;
  geoCountry?: string | null;
  locale?: Locale;
}): CheckoutRoutingResult {
  const buyerCountry = resolveBuyerCountry(input);
  const access = assertMarketAccess({
    userCountryCode: input.userCountryCode,
    shipCountry: input.shipCountry,
    geoCountry: input.geoCountry,
  });

  const locale = input.locale ?? "ko";

  if (!access.allowed) {
    const disclaimer =
      access.message === MARKET_UNAVAILABLE_KO
        ? translate(locale, "market.unavailable")
        : locale === "en"
          ? access.messageEn
          : access.message;
    return {
      mode: "BLOCKED",
      buyerCountry,
      platformFeeBps: 0,
      primaryAction: "blocked",
      disclaimer,
      blockedReason: disclaimer,
    };
  }

  return {
    mode: "STRIPE",
    buyerCountry,
    platformFeeBps: MARKETPLACE_PLATFORM_FEE_BPS,
    primaryAction: "stripe_checkout",
    disclaimer: translate(locale, "market.stripeDisclaimer"),
  };
}

export function computeFeesForCheckoutMode(
  _mode: MarketplaceCheckoutMode,
  subtotalAmount: number,
  shippingAmount = 0,
  feeOpts?: MarketplaceFeeOptions
) {
  return computeMarketplaceFees(subtotalAmount, shippingAmount, feeOpts);
}

/** @deprecated legacy direct trade orders */
export type DirectTradeSnapshot = {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  contactPhone?: string | null;
  sellerDisplayName: string;
  amount: number;
  currency: string;
  platformFeeAmount: number;
  notice: string;
};

/** @deprecated Stripe-only — direct trade removed */

/** @deprecated */
export function isDirectTradeBuyerCountry(_countryCode: string | null | undefined): boolean {
  return false;
}

/** @deprecated */
export function isStripeCheckoutBuyerCountry(countryCode: string | null | undefined): boolean {
  return isStripeMarketCountry(countryCode);
}

/** @deprecated use isStripeMarketCountry from market-access */
export { isStripeSupportedSellerCountry } from "@/lib/marketplace/market-access";

export { MARKET_UNAVAILABLE_KO, MARKET_UNAVAILABLE_EN };
