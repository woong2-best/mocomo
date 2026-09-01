"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { MarketplaceSellerOnboardingStep, MarketplaceSellerType } from "@prisma/client";
import { db } from "@/lib/db";
import { auth, requireAuthForAction } from "@/lib/auth";
import { registerUser, sendEmailAuthCode, completeAuthWithCode } from "@/actions/auth";
import {
  isStripeConnectConfigured,
  pullAndSyncStripeConnectAccount,
  refreshSellerConnectLink,
  startSellerConnectOnboarding,
  syncStripeConnectOnboardedAt,
} from "@/lib/stripe-connect";
import { type SellerOnboardingStepId } from "@/lib/marketplace/seller-onboarding";
import { normalizeSellerCountry } from "@/lib/marketplace/seller-region-policy";
import {
  isSellerStripeConnectReady,
  resolveSellerOnboardingStep,
  sellerOnboardingUserSelect,
} from "@/lib/marketplace/seller-onboarding-state";
import { stripeConnectStatusLabel } from "@/lib/marketplace/stripe-connect-sync";
import { isSignupHumanVerifyRequired } from "@/lib/turnstile-signup";
import { checkRateLimit, authLimiter } from "@/lib/ratelimit";
import { getRequestIp } from "@/lib/request-ip";
import { createNotification } from "@/lib/notifications";
import { MARKET_BRAND_FULL } from "@/lib/market-brand";
import { prismaErrorMessage } from "@/lib/prisma-user-error";

const accountSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/)
    .transform((s) => s.trim().toLowerCase()),
  password: z.string().min(8),
  passwordConfirm: z.string().min(8),
  name: z.string().min(1).max(80),
  email: z.string().email(),
  sellingMarket: z.string().min(2).max(8).default("KR"),
  locale: z.enum(["ko", "en", "ja", "zh"]).default("ko"),
  timeZone: z.string().min(1).max(64).optional(),
  turnstileToken: z.string().optional(),
  turnstileUnavailable: z.boolean().optional(),
  humanChallengeToken: z.string().optional(),
  humanChallengeAnswer: z.string().optional(),
});

const agreementsSchema = z.object({
  agreeAge: z.literal(true),
  agreeTerms: z.literal(true),
  agreePrivacy: z.literal(true),
  agreeMarketing: z.boolean().optional(),
  agreePromo: z.boolean().optional(),
});

const sellerInfoSchema = z.object({
  sellerType: z.enum(["INDIVIDUAL", "BUSINESS"]),
  displayName: z.string().min(1).max(80),
  bio: z.string().max(2000).optional(),
});

async function getSessionUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** @deprecated Stripe Connect 단일 SETTLEMENT 단계 */
export type SellerSettlementPhase = null;

function buildOnboardingStateFromUser(
  user: NonNullable<Awaited<ReturnType<typeof loadOnboardingUser>>>
) {
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
    settlementPhase: null,
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
          agreedMarketingAt: profile.agreedMarketingAt,
          agreedPromoAt: profile.agreedPromoAt,
          stripeConnectPayoutsEnabled: profile.stripeConnectPayoutsEnabled,
          stripeConnectRequirementsDue: profile.stripeConnectRequirementsDue,
          stripeConnectOnboardingStatus: profile.stripeConnectOnboardingStatus,
        }
      : null,
  };
}

async function loadOnboardingUser(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: sellerOnboardingUserSelect,
  });
}

export async function getSellerOnboardingState() {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      signedIn: false as const,
      step: "ACCOUNT" as SellerOnboardingStepId,
      emailVerified: false,
      connectReady: false,
      profile: null,
    };
  }

  const user = await loadOnboardingUser(session.user.id);
  if (!user) {
    return {
      signedIn: false as const,
      step: "ACCOUNT" as SellerOnboardingStepId,
      emailVerified: false,
      connectReady: false,
      profile: null,
    };
  }

  return buildOnboardingStateFromUser(user);
}

async function limitSellerAction(bucket: string) {
  if (!authLimiter) return { ok: true as const };
  const ip = await getRequestIp();
  const { success } = await checkRateLimit(authLimiter, `seller:${bucket}:${ip}`);
  if (!success) {
    return { ok: false as const, error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." };
  }
  return { ok: true as const };
}

export async function registerSellerAccount(input: z.infer<typeof accountSchema>) {
  const limited = await limitSellerAction("register");
  if (!limited.ok) return { error: limited.error };

  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) return { error: "입력값이 올바르지 않습니다." };
  const data = parsed.data;

  if (data.password !== data.passwordConfirm) {
    return { error: "비밀번호가 일치하지 않습니다." };
  }

  const sellingMarket = normalizeSellerCountry(data.sellingMarket);

  const existingSession = await getSessionUserId();
  if (existingSession) {
    return {
      error: "이미 로그인되어 있습니다. 약관 동의 단계부터 이어서 진행해 주세요.",
      alreadySignedIn: true,
    };
  }

  const result = await registerUser({
    email: data.email.trim().toLowerCase(),
    username: data.username,
    password: data.password,
    name: data.name.trim(),
    locale: data.locale,
    countryCode: sellingMarket,
    timeZone: data.timeZone,
    turnstileToken: data.turnstileToken,
    turnstileUnavailable: data.turnstileUnavailable ?? !isSignupHumanVerifyRequired(),
    humanChallengeToken: data.humanChallengeToken,
    humanChallengeAnswer: data.humanChallengeAnswer,
  });

  if (result.error) return { error: result.error };
  if (!result.userId) return { error: "계정 생성에 실패했습니다." };

  await db.marketplaceSellerProfile.upsert({
    where: { userId: result.userId },
    create: {
      userId: result.userId,
      displayName: data.name.trim().slice(0, 80),
      sellingMarket,
      onboardingStep: "EMAIL",
      status: "PENDING",
      canList: false,
    },
    update: {
      displayName: data.name.trim().slice(0, 80),
      sellingMarket,
      onboardingStep: "EMAIL",
      status: "PENDING",
      canList: false,
    },
  });

  return {
    success: true as const,
    userId: result.userId,
    email: data.email.trim().toLowerCase(),
    needsVerification: result.needsVerification ?? true,
  };
}

export async function saveSellerAgreements(input: z.infer<typeof agreementsSchema>) {
  const limited = await limitSellerAction("agreements");
  if (!limited.ok) return { error: limited.error };

  const parsed = agreementsSchema.safeParse(input);
  if (!parsed.success) return { error: "필수 약관에 모두 동의해 주세요." };

  const user = await requireAuthForAction();
  const now = new Date();

  const dbUser = await loadOnboardingUser(user.id);
  const country = normalizeSellerCountry(
    dbUser?.marketplaceSeller?.sellingMarket || dbUser?.countryCode
  );

  const profile = await db.marketplaceSellerProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      displayName: user.username,
      status: "PENDING",
      canList: false,
      sellingMarket: country,
      onboardingStep: "EMAIL",
      agreedAgeAt: now,
      agreedTermsAt: now,
      agreedPrivacyAt: now,
      agreedMarketingAt: input.agreeMarketing ? now : null,
      agreedPromoAt: input.agreePromo ? now : null,
    },
    update: {
      agreedAgeAt: now,
      agreedTermsAt: now,
      agreedPrivacyAt: now,
      agreedMarketingAt: input.agreeMarketing ? now : null,
      agreedPromoAt: input.agreePromo ? now : null,
    },
  });

  const next = resolveSellerOnboardingStep({
    emailVerified: !!dbUser?.emailVerified,
    profile,
  });

  await db.marketplaceSellerProfile.update({
    where: { id: profile.id },
    data: { onboardingStep: next, sellingMarket: country },
  });

  revalidatePath("/market/seller/register");
  return { success: true as const, nextStep: next };
}

export async function verifySellerEmailCode(email: string, code: string) {
  const limited = await limitSellerAction("email-verify");
  if (!limited.ok) return { error: limited.error };

  const result = await completeAuthWithCode(email, code, { mode: "signup" });
  if ("error" in result && result.error) return { error: result.error };

  const sessionUser = await getSessionUserId();
  const userId =
    sessionUser ??
    (
      await db.user.findFirst({
        where: { email: email.trim().toLowerCase() },
        select: { id: true },
      })
    )?.id;

  if (userId) {
    const dbUser = await loadOnboardingUser(userId);
    const next = !dbUser?.marketplaceSeller?.agreedTermsAt
      ? ("AGREEMENTS" as const)
      : resolveSellerOnboardingStep({
          emailVerified: true,
          profile: dbUser?.marketplaceSeller ?? null,
        });
    await db.marketplaceSellerProfile.updateMany({
      where: { userId },
      data: { onboardingStep: next },
    });
  }

  revalidatePath("/market/seller/register");
  return { success: true as const };
}

export async function resendSellerEmailCode(email: string) {
  const limited = await limitSellerAction("email-resend");
  if (!limited.ok) return { error: limited.error };
  return sendEmailAuthCode(email, "signup", undefined, true);
}

/** @deprecated Stripe Connect 온보딩으로 대체 */
export async function advanceSellerPhoneStep(_phoneCountryCode: string) {
  return { success: true as const, nextStep: "SELLER_INFO" as const };
}

export async function saveSellerInfo(input: z.infer<typeof sellerInfoSchema>) {
  const limited = await limitSellerAction("info");
  if (!limited.ok) return { error: limited.error };

  const parsed = sellerInfoSchema.safeParse(input);
  if (!parsed.success) return { error: "판매자 정보를 확인해 주세요." };
  const data = parsed.data;

  const user = await requireAuthForAction();
  const displayName = data.displayName.trim().slice(0, 80);
  const dbUser = await loadOnboardingUser(user.id);
  const country = normalizeSellerCountry(
    dbUser?.marketplaceSeller?.sellingMarket || dbUser?.countryCode
  );
  const nextStep: MarketplaceSellerOnboardingStep = "SETTLEMENT";

  await db.marketplaceSellerProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      displayName,
      bio: data.bio?.trim().slice(0, 2000) || null,
      sellerType: data.sellerType as MarketplaceSellerType,
      status: "PENDING",
      canList: false,
      sellingMarket: country,
      onboardingStep: nextStep,
    },
    update: {
      displayName,
      bio: data.bio?.trim().slice(0, 2000) || null,
      sellerType: data.sellerType as MarketplaceSellerType,
      onboardingStep: nextStep,
    },
  });

  revalidatePath("/market/seller/register");
  return { success: true as const, nextStep };
}

/** @deprecated Stripe Connect Hosted Onboarding으로 대체 */
export async function submitSellerKyc(_input: unknown) {
  return {
    error: "신분증은 Stripe 온보딩에서 직접 제출해 주세요. Stripe 단계로 이동합니다.",
  };
}

/** @deprecated */
export async function submitSellerKycPrep(_mode: "defer" | "start") {
  return { error: "Stripe Connect 온보딩을 이용해 주세요." };
}

export type StartStripeConnectInput = {
  fromApp?: boolean;
  returnTo?: string | null;
};

/** Stripe Express 계정 생성 + Hosted Onboarding URL */
export async function startSellerStripeConnectOnboarding(input: StartStripeConnectInput = {}) {
  try {
    const user = await requireAuthForAction();
    const dbUser = await loadOnboardingUser(user.id);
    if (!dbUser?.marketplaceSeller?.sellerType) {
      return { error: "판매자 정보를 먼저 입력해 주세요." };
    }

    const country = normalizeSellerCountry(
      dbUser.marketplaceSeller.sellingMarket || dbUser.countryCode
    );

    const result = await startSellerConnectOnboarding({
      userId: user.id,
      email: dbUser.email,
      stripeConnectAccountId: dbUser.stripeConnectAccountId,
      countryCode: country,
      urlContext: { fromApp: input.fromApp, returnTo: input.returnTo ?? null },
    });

    if ("error" in result) return { error: result.error };

    revalidatePath("/market/seller/register");
    return { url: result.url, accountId: result.accountId };
  } catch (e) {
    console.error("[startSellerStripeConnectOnboarding]", e);
    return { error: prismaErrorMessage(e) };
  }
}

/** @deprecated startSellerStripeConnectOnboarding 사용 */
export async function startSellerStripeConnectPrep() {
  return startSellerStripeConnectOnboarding();
}

export async function startSellerSettlementOnboarding(input: StartStripeConnectInput = {}) {
  return startSellerStripeConnectOnboarding(input);
}

/** @deprecated Stripe Connect 온보딩으로 대체 */
export async function declareSellerSettlementForReview(_note?: string) {
  return startSellerStripeConnectOnboarding();
}

export async function markSellerConnectReturn() {
  try {
    const user = await requireAuthForAction();
    const dbUser = await loadOnboardingUser(user.id);
    if (dbUser?.stripeConnectAccountId) {
      await syncStripeConnectOnboardedAt(user.id, dbUser.stripeConnectAccountId);
    }

    const refreshed = dbUser ? await loadOnboardingUser(user.id) : null;
    const profile = refreshed?.marketplaceSeller;

    if (profile?.onboardingCompletedAt) {
      revalidatePath("/market/seller/register");
      return completeSellerOnboarding();
    }

    revalidatePath("/market/seller/register");
    return {
      success: true as const,
      nextStep: "SETTLEMENT" as const,
      stripeRequirementsDue: profile?.stripeConnectRequirementsDue ?? false,
    };
  } catch (e) {
    console.error("[markSellerConnectReturn]", e);
    return { error: prismaErrorMessage(e) };
  }
}

export async function completeSellerOnboarding() {
  try {
    const user = await requireAuthForAction();
    const dbUser = await loadOnboardingUser(user.id);

    if (!dbUser?.emailVerified) return { error: "이메일 인증이 필요합니다." };
    if (!dbUser.marketplaceSeller?.agreedTermsAt || !dbUser.marketplaceSeller?.agreedPrivacyAt) {
      return { error: "판매자 이용약관 및 개인정보 처리방침 동의가 필요합니다." };
    }
    if (!dbUser.marketplaceSeller.sellerType) {
      return { error: "판매자 정보(개인/사업자)를 입력해 주세요." };
    }

    if (dbUser.stripeConnectAccountId) {
      await pullAndSyncStripeConnectAccount(dbUser.stripeConnectAccountId);
    }

    const refreshed = await loadOnboardingUser(user.id);
    const profile = refreshed?.marketplaceSeller;
    if (!isSellerStripeConnectReady(profile)) {
      return { error: "Stripe 본인 확인 및 정산 계좌 등록을 완료해 주세요." };
    }

    if (profile?.onboardingCompletedAt) {
      return {
        success: true as const,
        redirectTo: "/market/seller?welcome=1",
        autoApproved: profile.status === "APPROVED",
      };
    }

    const now = new Date();
    await db.marketplaceSellerProfile.update({
      where: { userId: user.id },
      data: {
        status: "APPROVED",
        onboardingStep: "COMPLETE",
        onboardingCompletedAt: now,
        canList: true,
        reviewedAt: now,
      },
    });

    await createNotification({
      userId: user.id,
      type: "system",
      title: "판매자 등록 완료",
      body: `${MARKET_BRAND_FULL} Stripe 본인 확인 및 정산 설정이 완료되었습니다. 이제 상품을 등록할 수 있습니다.`,
      link: "/market/seller",
    }).catch(() => null);

    revalidatePath("/market/seller");
    revalidatePath("/market/seller/register");
    revalidatePath("/admin/market");
    return {
      success: true as const,
      redirectTo: "/market/seller?welcome=1",
      autoApproved: true,
    };
  } catch (e) {
    console.error("[completeSellerOnboarding]", e);
    return { error: prismaErrorMessage(e) };
  }
}

/** Stripe 온보딩 이어서 하기 — Account Link 재발급 */
export async function resumeSellerConnectFromOnboarding(input: StartStripeConnectInput = {}) {
  try {
    const user = await requireAuthForAction();
    const dbUser = await loadOnboardingUser(user.id);
    const country = normalizeSellerCountry(
      dbUser?.marketplaceSeller?.sellingMarket || dbUser?.countryCode || "KR"
    );

    if (!dbUser?.stripeConnectAccountId) {
      return startSellerStripeConnectOnboarding(input);
    }

    const link = await refreshSellerConnectLink(dbUser.stripeConnectAccountId, {
      fromApp: input.fromApp,
      returnTo: input.returnTo ?? null,
    });
    if ("error" in link) return { error: link.error };
    return { url: link.url };
  } catch (e) {
    console.error("[resumeSellerConnectFromOnboarding]", e);
    return { error: prismaErrorMessage(e) };
  }
}
