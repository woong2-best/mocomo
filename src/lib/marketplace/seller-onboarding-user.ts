import type { MarketplaceSellerOnboardingStep } from "@prisma/client";
import { db } from "@/lib/db";
import { isStripeConnectConfigured } from "@/lib/stripe-connect";
import type { SellerOnboardingStepId } from "@/lib/marketplace/seller-onboarding";
import {
  isKrSellerCountry,
  normalizeSellerCountry,
  sellerRequiresPhoneVerification,
} from "@/lib/marketplace/seller-region-policy";
import type { SellerSettlementPhase } from "@/actions/marketplace-seller-onboarding";

/** Bearer/mobile — cookie session 없이 userId로 온보딩 상태 조회 */
export async function getSellerOnboardingStateForUserId(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      emailVerified: true,
      phone: true,
      phoneVerified: true,
      countryCode: true,
      stripeConnectAccountId: true,
      stripeConnectOnboardedAt: true,
      marketplaceSeller: true,
    },
  });

  if (!user) {
    return {
      signedIn: false as const,
      step: "ACCOUNT" as SellerOnboardingStepId,
      emailVerified: false,
      phoneVerified: false,
      phoneRequired: true,
      connectReady: false,
      profile: null,
    };
  }

  const profile = user.marketplaceSeller;
  const country = normalizeSellerCountry(profile?.sellingMarket || user.countryCode);
  const phoneRequired = sellerRequiresPhoneVerification(country);
  const isKr = isKrSellerCountry(country);
  const kycStarted =
    !!profile && profile.kycStatus !== "NOT_STARTED" && profile.kycStatus !== "DEFERRED";
  const stripeStarted = !!(
    profile?.stripeConnectStartedAt ||
    user.stripeConnectAccountId ||
    user.stripeConnectOnboardedAt
  );
  const bankReady = !!(profile?.settlementDeclaredAt || user.stripeConnectOnboardedAt);

  let step: SellerOnboardingStepId = "AGREEMENTS";
  let settlementPhase: SellerSettlementPhase = null;

  if (profile?.onboardingCompletedAt) {
    step = "COMPLETE";
  } else if (!user.emailVerified) {
    step = "EMAIL";
  } else if (!profile?.agreedTermsAt || !profile?.agreedPrivacyAt || !profile?.agreedAgeAt) {
    step = "AGREEMENTS";
  } else if (phoneRequired && !user.phoneVerified) {
    step = "PHONE";
  } else if (!profile?.sellerType) {
    step = "SELLER_INFO";
  } else if (!isKr) {
    if (!stripeStarted) {
      step = "SETTLEMENT";
      settlementPhase = "stripe";
    } else if (!kycStarted) {
      step = "KYC";
    } else if (!bankReady) {
      step = "SETTLEMENT";
      settlementPhase = "bank";
    } else {
      step = "SETTLEMENT";
      settlementPhase = "done";
    }
  } else if (!kycStarted) {
    step = "KYC";
  } else if (!bankReady && !user.stripeConnectAccountId) {
    step = "SETTLEMENT";
    settlementPhase = "bank";
  } else {
    step = "SETTLEMENT";
    settlementPhase = bankReady || user.stripeConnectAccountId ? "done" : "bank";
  }

  return {
    signedIn: true as const,
    step,
    settlementPhase,
    email: user.email,
    username: user.username,
    name: user.name,
    emailVerified: !!user.emailVerified,
    phoneVerified: !!user.phoneVerified,
    phoneRequired,
    phone: user.phone,
    countryCode: country,
    sellingMarket: profile?.sellingMarket ?? country,
    connectReady: !!(user.stripeConnectOnboardedAt || user.stripeConnectAccountId),
    stripeStarted,
    settlementDeclared: !!profile?.settlementDeclaredAt,
    stripeConfigured: isStripeConnectConfigured(),
    isKr,
    profile: profile
      ? {
          id: profile.id,
          displayName: profile.displayName,
          sellerType: profile.sellerType,
          sellingMarket: profile.sellingMarket,
          businessName: profile.businessName,
          businessRegNo: profile.businessRegNo,
          businessRepresentativeName: profile.businessRepresentativeName,
          businessStartDate: profile.businessStartDate,
          businessVerifiedAt: profile.businessVerifiedAt?.toISOString() ?? null,
          bio: profile.bio,
          status: profile.status,
          canList: profile.canList,
          onboardingStep: profile.onboardingStep as MarketplaceSellerOnboardingStep,
          onboardingCompletedAt: profile.onboardingCompletedAt?.toISOString() ?? null,
          kycStatus: profile.kycStatus,
          kycIdType: profile.kycIdType,
          kycLegalName: profile.kycLegalName,
        }
      : null,
  };
}
