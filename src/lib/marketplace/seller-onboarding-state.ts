import type { MarketplaceSellerProfile } from "@prisma/client";
import type { SellerOnboardingStepId } from "@/lib/marketplace/seller-onboarding";
import { isStripeMarketCountry } from "@/lib/marketplace/market-access";
import { normalizeSellerCountry } from "@/lib/marketplace/seller-region-policy";

export type SellerStripeConnectFields = Pick<
  MarketplaceSellerProfile,
  | "stripeConnectPayoutsEnabled"
  | "stripeConnectRequirementsDue"
  | "stripeConnectDisabledReason"
  | "stripeConnectOnboardingStatus"
  | "onboardingCompletedAt"
  | "agreedTermsAt"
  | "agreedPrivacyAt"
  | "agreedAgeAt"
  | "sellerType"
  | "sellingMarket"
  | "businessRegNo"
>;

/** Stripe Connect 정산 준비 완료 */
export function isSellerSettlementReady(profile: SellerStripeConnectFields | null): boolean {
  if (!profile) return false;
  if (profile.onboardingCompletedAt) return true;
  return isSellerStripeConnectReady(profile);
}

export function resolveSellerOnboardingStep(input: {
  emailVerified: boolean;
  profile: SellerStripeConnectFields | null;
  sellingMarket?: string | null;
}): SellerOnboardingStepId {
  const profile = input.profile;
  const market = normalizeSellerCountry(profile?.sellingMarket || input.sellingMarket);

  if (!isStripeMarketCountry(market)) {
    return profile?.agreedTermsAt ? "SELLER_INFO" : "AGREEMENTS";
  }

  if (profile?.onboardingCompletedAt) {
    return "COMPLETE";
  }
  if (!input.emailVerified) {
    return "EMAIL";
  }
  if (!profile?.agreedTermsAt || !profile?.agreedPrivacyAt || !profile?.agreedAgeAt) {
    return "AGREEMENTS";
  }
  if (!profile?.sellerType || !profile.businessRegNo?.trim()) {
    return "SELLER_INFO";
  }

  if (!isSellerSettlementReady(profile)) {
    return "SETTLEMENT";
  }

  return "COMPLETE";
}

export function isSellerStripeConnectReady(profile: SellerStripeConnectFields | null): boolean {
  if (!profile) return false;
  if (profile.stripeConnectDisabledReason) return false;
  if (profile.stripeConnectOnboardingStatus === "DISABLED") return false;
  return (
    profile.stripeConnectPayoutsEnabled &&
    !profile.stripeConnectRequirementsDue &&
    profile.stripeConnectOnboardingStatus === "COMPLETE"
  );
}

export const sellerOnboardingUserSelect = {
  id: true,
  email: true,
  username: true,
  name: true,
  emailVerified: true,
  countryCode: true,
  stripeConnectAccountId: true,
  stripeConnectOnboardedAt: true,
  marketplaceSeller: {
    select: {
      id: true,
      displayName: true,
      sellerType: true,
      sellingMarket: true,
      bio: true,
      status: true,
      onboardingStep: true,
      onboardingCompletedAt: true,
      agreedMarketingAt: true,
      agreedPromoAt: true,
      agreedTermsAt: true,
      agreedPrivacyAt: true,
      agreedAgeAt: true,
      stripeConnectStartedAt: true,
      stripeConnectChargesEnabled: true,
      stripeConnectPayoutsEnabled: true,
      stripeConnectRequirementsDue: true,
      stripeConnectDisabledReason: true,
      stripeConnectOnboardingStatus: true,
      businessRegNo: true,
    },
  },
} as const;
