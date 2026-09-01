import { db } from "@/lib/db";
import { isStripeConnectConfigured } from "@/lib/stripe-connect";
import type { SellerOnboardingStepId } from "@/lib/marketplace/seller-onboarding";
import { normalizeSellerCountry } from "@/lib/marketplace/seller-region-policy";
import {
  isSellerStripeConnectReady,
  resolveSellerOnboardingStep,
  sellerOnboardingUserSelect,
} from "@/lib/marketplace/seller-onboarding-state";
import { stripeConnectStatusLabel } from "@/lib/marketplace/stripe-connect-sync";

/** Bearer/mobile — cookie session 없이 userId로 온보딩 상태 조회 */
export async function getSellerOnboardingStateForUserId(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: sellerOnboardingUserSelect,
  });

  if (!user) {
    return {
      signedIn: false as const,
      step: "ACCOUNT" as SellerOnboardingStepId,
      emailVerified: false,
      connectReady: false,
      profile: null,
    };
  }

  const profile = user.marketplaceSeller;
  const country = normalizeSellerCountry(profile?.sellingMarket || user.countryCode);
  const step = resolveSellerOnboardingStep({
    emailVerified: !!user.emailVerified,
    profile,
  });

  const stripeReady = isSellerStripeConnectReady(profile);
  const stripeStatus = profile?.stripeConnectOnboardingStatus ?? "NOT_STARTED";
  const requirementsDue = !!profile?.stripeConnectRequirementsDue;

  return {
    signedIn: true as const,
    step,
    email: user.email,
    username: user.username,
    name: user.name,
    emailVerified: !!user.emailVerified,
    countryCode: country,
    sellingMarket: profile?.sellingMarket ?? country,
    connectReady: stripeReady,
    stripeStarted: !!(
      profile?.stripeConnectStartedAt ||
      user.stripeConnectAccountId ||
      user.stripeConnectOnboardedAt
    ),
    stripeConfigured: isStripeConnectConfigured(),
    stripeStatus,
    stripeStatusMessage: stripeConnectStatusLabel(stripeStatus, requirementsDue),
    stripeRequirementsDue: requirementsDue,
    stripeDisabled: !!profile?.stripeConnectDisabledReason,
    profile: profile
      ? {
          id: profile.id,
          displayName: profile.displayName,
          sellerType: profile.sellerType,
          sellingMarket: profile.sellingMarket,
          bio: profile.bio,
          status: profile.status,
          onboardingStep: profile.onboardingStep,
          onboardingCompletedAt: profile.onboardingCompletedAt,
          stripeConnectOnboardingStatus: profile.stripeConnectOnboardingStatus,
        }
      : null,
  };
}
