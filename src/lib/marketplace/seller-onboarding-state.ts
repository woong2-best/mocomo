import type { MarketplaceSellerProfile } from "@prisma/client";
import type { SellerOnboardingStepId } from "@/lib/marketplace/seller-onboarding";

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
>;

/** Stripe Connect 기반 온보딩 단계 결정 */
export function resolveSellerOnboardingStep(input: {
  emailVerified: boolean;
  profile: SellerStripeConnectFields | null;
}): SellerOnboardingStepId {
  const profile = input.profile;

  if (profile?.onboardingCompletedAt) {
    return "COMPLETE";
  }
  if (!input.emailVerified) {
    return "EMAIL";
  }
  if (!profile?.agreedTermsAt || !profile?.agreedPrivacyAt || !profile?.agreedAgeAt) {
    return "AGREEMENTS";
  }
  if (!profile?.sellerType) {
    return "SELLER_INFO";
  }

  if (!isSellerStripeConnectReady(profile)) {
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
    },
  },
} as const;
