import { db } from "@/lib/db";
import {
  resolveCheckoutRouting,
  type CheckoutRoutingResult,
} from "@/lib/marketplace/payment-routing";
import type { Locale } from "@/lib/i18n/config";
import { translate } from "@/lib/i18n/messages";
import { getRequestCountryFromHeaders } from "@/lib/compliance/request-country";
import type { MarketplaceCheckoutMode } from "@prisma/client";

export type MarketplaceCheckoutEligibility = CheckoutRoutingResult & {
  listingId: string;
  paymentsConfigured: boolean;
  sellerReady: boolean;
  sellerReadyMessage?: string;
  primaryButtonLabel: string;
  disclaimer: string;
  blocked?: boolean;
};

export async function getMarketplaceCheckoutEligibility(input: {
  listingId: string;
  userId?: string | null;
  shipCountry?: string | null;
  headers?: Headers;
  locale?: Locale;
}): Promise<MarketplaceCheckoutEligibility | { error: string }> {
  const listing = await db.marketplaceListing.findUnique({
    where: { id: input.listingId },
    select: {
      id: true,
      status: true,
      sellerId: true,
      sellerProfile: {
        select: {
          status: true,
          sellingMarket: true,
          stripeConnectPayoutsEnabled: true,
          stripeConnectOnboardingStatus: true,
        },
      },
      seller: {
        select: {
          stripeConnectAccountId: true,
        },
      },
    },
  });

  if (!listing || listing.status !== "ACTIVE") {
    return { error: "판매 중인 상품이 아닙니다." };
  }

  let userCountry: string | null = null;
  if (input.userId) {
    const user = await db.user.findUnique({
      where: { id: input.userId },
      select: { countryCode: true },
    });
    userCountry = user?.countryCode ?? null;
  }

  const routing = resolveCheckoutRouting({
    userCountryCode: userCountry,
    shipCountry: input.shipCountry,
    geoCountry: input.headers ? getRequestCountryFromHeaders(input.headers) : null,
    locale: input.locale,
  });

  const locale = input.locale ?? "ko";
  const blocked = routing.mode === "BLOCKED";

  let sellerReady = !blocked;
  let sellerReadyMessage: string | undefined;

  if (!blocked) {
    const connectOk =
      !!listing.seller.stripeConnectAccountId &&
      listing.sellerProfile?.stripeConnectOnboardingStatus === "COMPLETE" &&
      listing.sellerProfile?.stripeConnectPayoutsEnabled;
    if (!connectOk) {
      sellerReady = false;
      sellerReadyMessage = translate(locale, "market.sellerNotReady");
    }
  }

  const primaryButtonLabel = blocked
    ? translate(locale, "market.regionBlocked")
    : translate(locale, "market.buyNow");

  const { isPaymentsConfigured } = await import("@/lib/payments");

  return {
    ...routing,
    mode: (blocked ? "BLOCKED" : "STRIPE") as MarketplaceCheckoutMode | "BLOCKED",
    listingId: listing.id,
    paymentsConfigured: isPaymentsConfigured(),
    sellerReady,
    sellerReadyMessage,
    primaryButtonLabel,
    disclaimer: routing.disclaimer,
    blocked,
  };
}
