"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { MarketplaceSellerOnboardingStep, MarketplaceSellerType } from "@prisma/client";
import { db } from "@/lib/db";
import { auth, requireAuth } from "@/lib/auth";
import { registerUser, sendEmailAuthCode, completeAuthWithCode } from "@/actions/auth";
import {
  createSellerConnectOnboarding,
  isStripeConnectConfigured,
} from "@/lib/stripe-connect";
import { isSellerPhoneCountry } from "@/lib/marketplace/seller-phone-countries";
import { type SellerOnboardingStepId } from "@/lib/marketplace/seller-onboarding";
import { isSignupHumanVerifyRequired } from "@/lib/turnstile-signup";
import { checkRateLimit, authLimiter } from "@/lib/ratelimit";
import { getRequestIp } from "@/lib/request-ip";
import { normalizeMobilePhone } from "@/lib/phone-international";
import { consumeSellerPhoneProof } from "@/lib/marketplace/seller-phone-proof";

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
  phoneCountryCode: z.string().min(2).max(8),
  phone: z.string().min(4).max(40),
  phoneProof: z.string().min(8),
  locale: z.enum(["ko", "en", "ja", "zh"]).default("ko"),
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
  businessName: z.string().max(120).optional(),
  businessRegNo: z.string().max(40).optional(),
});

async function getSessionUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function getSellerOnboardingState() {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      signedIn: false as const,
      step: "ACCOUNT" as SellerOnboardingStepId,
      emailVerified: false,
      phoneVerified: false,
      connectReady: false,
      profile: null,
    };
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
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
      connectReady: false,
      profile: null,
    };
  }

  const profile = user.marketplaceSeller;
  let step: SellerOnboardingStepId = "AGREEMENTS";

  if (profile?.onboardingCompletedAt) {
    step = "COMPLETE";
  } else if (!user.emailVerified) {
    step = "EMAIL";
  } else if (!profile?.agreedTermsAt || !profile?.agreedPrivacyAt || !profile?.agreedAgeAt) {
    step = "AGREEMENTS";
  } else if (!user.phoneVerified) {
    step = "PHONE";
  } else if (!profile.sellerType) {
    step = "SELLER_INFO";
  } else if (profile.kycStatus === "NOT_STARTED") {
    step = "KYC";
  } else {
    step = "SETTLEMENT";
  }

  return {
    signedIn: true as const,
    step,
    email: user.email,
    username: user.username,
    name: user.name,
    emailVerified: !!user.emailVerified,
    phoneVerified: !!user.phoneVerified,
    phone: user.phone,
    countryCode: user.countryCode,
    phoneCountryCode: profile?.phoneCountryCode ?? user.countryCode,
    connectReady: !!(user.stripeConnectOnboardedAt || user.stripeConnectAccountId),
    stripeConfigured: isStripeConnectConfigured(),
    profile: profile
      ? {
          id: profile.id,
          displayName: profile.displayName,
          sellerType: profile.sellerType,
          sellingMarket: profile.sellingMarket,
          businessName: profile.businessName,
          businessRegNo: profile.businessRegNo,
          bio: profile.bio,
          status: profile.status,
          onboardingStep: profile.onboardingStep,
          onboardingCompletedAt: profile.onboardingCompletedAt,
          kycStatus: profile.kycStatus,
          agreedMarketingAt: profile.agreedMarketingAt,
          agreedPromoAt: profile.agreedPromoAt,
        }
      : null,
  };
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

/** 신규 판매자 계정 생성 (기존 MoCoMo User) */
export async function registerSellerAccount(input: z.infer<typeof accountSchema>) {
  const limited = await limitSellerAction("register");
  if (!limited.ok) return { error: limited.error };

  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) return { error: "입력값이 올바르지 않습니다." };
  const data = parsed.data;

  if (data.password !== data.passwordConfirm) {
    return { error: "비밀번호가 일치하지 않습니다." };
  }
  if (!isSellerPhoneCountry(data.phoneCountryCode)) {
    return { error: "휴대폰 국가를 중국·홍콩·한국·일본·미국 중에서 선택해 주세요." };
  }

  const phoneE164 = normalizeMobilePhone(data.phone, data.phoneCountryCode.toUpperCase());
  if (!phoneE164) return { error: "휴대폰 번호 형식이 올바르지 않습니다." };
  if (!data.phoneProof) return { error: "휴대폰 인증을 완료해 주세요." };

  const existingSession = await getSessionUserId();
  if (existingSession) {
    return { error: "이미 로그인되어 있습니다. 약관 동의 단계부터 이어서 진행해 주세요.", alreadySignedIn: true };
  }

  const result = await registerUser({
    email: data.email.trim().toLowerCase(),
    username: data.username,
    password: data.password,
    name: data.name.trim(),
    locale: data.locale,
    countryCode: data.phoneCountryCode.toUpperCase(),
    turnstileToken: data.turnstileToken,
    turnstileUnavailable: data.turnstileUnavailable ?? !isSignupHumanVerifyRequired(),
    humanChallengeToken: data.humanChallengeToken,
    humanChallengeAnswer: data.humanChallengeAnswer,
  });

  if (result.error) return { error: result.error };
  if (!result.userId) return { error: "계정 생성에 실패했습니다." };

  const phoneAttach = await consumeSellerPhoneProof(phoneE164, data.phoneProof, result.userId);
  if (!phoneAttach.ok) {
    // 계정은 만들어졌으므로 이어서 인증하도록 안내
    return { error: phoneAttach.error, userId: result.userId, email: data.email.trim().toLowerCase() };
  }

  await db.marketplaceSellerProfile.upsert({
    where: { userId: result.userId },
    create: {
      userId: result.userId,
      displayName: data.name.trim().slice(0, 80),
      sellingMarket: data.sellingMarket.toUpperCase(),
      phoneCountryCode: data.phoneCountryCode.toUpperCase(),
      onboardingStep: "EMAIL",
      status: "PENDING",
    },
    update: {
      displayName: data.name.trim().slice(0, 80),
      sellingMarket: data.sellingMarket.toUpperCase(),
      phoneCountryCode: data.phoneCountryCode.toUpperCase(),
      onboardingStep: "EMAIL",
    },
  });

  return {
    success: true as const,
    userId: result.userId,
    email: data.email.trim().toLowerCase(),
    needsVerification: result.needsVerification ?? true,
    phoneVerified: true as const,
  };
}

export async function saveSellerAgreements(input: z.infer<typeof agreementsSchema>) {
  const limited = await limitSellerAction("agreements");
  if (!limited.ok) return { error: limited.error };

  const parsed = agreementsSchema.safeParse(input);
  if (!parsed.success) return { error: "필수 약관에 모두 동의해 주세요." };

  const user = await requireAuth();
  const now = new Date();

  const profile = await db.marketplaceSellerProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      displayName: user.username,
      status: "PENDING",
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
      onboardingStep: "EMAIL",
    },
  });

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { emailVerified: true, phoneVerified: true },
  });

  let next: MarketplaceSellerOnboardingStep = "EMAIL";
  if (dbUser?.emailVerified) next = dbUser.phoneVerified ? "SELLER_INFO" : "PHONE";

  await db.marketplaceSellerProfile.update({
    where: { id: profile.id },
    data: { onboardingStep: next },
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
  const user = sessionUser
    ? await db.user.findUnique({ where: { id: sessionUser }, select: { id: true, phoneVerified: true } })
    : await db.user.findFirst({
        where: { email: email.trim().toLowerCase() },
        select: { id: true, phoneVerified: true },
      });

  if (user) {
    const profile = await db.marketplaceSellerProfile.findUnique({ where: { userId: user.id } });
    const next: MarketplaceSellerOnboardingStep =
      !profile?.agreedTermsAt ? "AGREEMENTS" : user.phoneVerified ? "SELLER_INFO" : "PHONE";
    await db.marketplaceSellerProfile.updateMany({
      where: { userId: user.id },
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

export async function advanceSellerPhoneStep(phoneCountryCode: string) {
  const user = await requireAuth();
  if (!isSellerPhoneCountry(phoneCountryCode)) {
    return { error: "지원하지 않는 국가 코드입니다." };
  }
  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { phoneVerified: true },
  });
  if (!dbUser?.phoneVerified) {
    return { error: "휴대폰 인증을 완료해 주세요." };
  }

  await db.marketplaceSellerProfile.updateMany({
    where: { userId: user.id },
    data: {
      phoneCountryCode: phoneCountryCode.toUpperCase(),
      onboardingStep: "SELLER_INFO",
    },
  });
  revalidatePath("/market/seller/register");
  return { success: true as const, nextStep: "SELLER_INFO" as const };
}

export async function saveSellerInfo(input: z.infer<typeof sellerInfoSchema>) {
  const limited = await limitSellerAction("info");
  if (!limited.ok) return { error: limited.error };

  const parsed = sellerInfoSchema.safeParse(input);
  if (!parsed.success) return { error: "판매자 정보를 확인해 주세요." };
  const data = parsed.data;

  if (data.sellerType === "BUSINESS") {
    if (!data.businessName?.trim()) return { error: "사업자명을 입력해 주세요." };
    if (!data.businessRegNo?.trim()) return { error: "사업자등록번호를 입력해 주세요." };
  }

  const user = await requireAuth();
  const displayName = data.displayName.trim().slice(0, 80);

  await db.marketplaceSellerProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      displayName,
      bio: data.bio?.trim().slice(0, 2000) || null,
      sellerType: data.sellerType as MarketplaceSellerType,
      businessName: data.sellerType === "BUSINESS" ? data.businessName!.trim() : null,
      businessRegNo: data.sellerType === "BUSINESS" ? data.businessRegNo!.trim() : null,
      status: "PENDING",
      onboardingStep: "KYC",
    },
    update: {
      displayName,
      bio: data.bio?.trim().slice(0, 2000) || null,
      sellerType: data.sellerType as MarketplaceSellerType,
      businessName: data.sellerType === "BUSINESS" ? data.businessName!.trim() : null,
      businessRegNo: data.sellerType === "BUSINESS" ? data.businessRegNo!.trim() : null,
      onboardingStep: "KYC",
    },
  });

  revalidatePath("/market/seller/register");
  return { success: true as const, nextStep: "KYC" as const };
}

/** 1차: KYC 준비 — 실인증은 2차. 지금은 DEFERRED 또는 PENDING 선언만 */
export async function submitSellerKycPrep(mode: "defer" | "start") {
  const user = await requireAuth();
  const now = new Date();

  await db.marketplaceSellerProfile.updateMany({
    where: { userId: user.id },
    data: {
      kycStatus: mode === "start" ? "PENDING" : "DEFERRED",
      kycSubmittedAt: now,
      kycNotes:
        mode === "start"
          ? "KYC 실인증 대기(2차 연동 예정)"
          : "판매자 온보딩 중 KYC 연기 — 판매자센터에서 추후 완료 가능",
      onboardingStep: "SETTLEMENT",
    },
  });

  revalidatePath("/market/seller/register");
  return { success: true as const, nextStep: "SETTLEMENT" as const };
}

export async function startSellerSettlementOnboarding() {
  const user = await requireAuth();
  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, stripeConnectAccountId: true },
  });
  if (!dbUser) return { error: "사용자를 찾을 수 없습니다." };

  // 온보딩 중에는 프로필이 있어야 함
  const profile = await db.marketplaceSellerProfile.findUnique({ where: { userId: user.id } });
  if (!profile) return { error: "판매자 프로필을 먼저 생성해 주세요." };

  const result = await createSellerConnectOnboarding({
    id: dbUser.id,
    email: dbUser.email,
    stripeConnectAccountId: dbUser.stripeConnectAccountId,
  });
  if ("error" in result) return result;

  if (result.accountId !== dbUser.stripeConnectAccountId) {
    await db.user.update({
      where: { id: user.id },
      data: { stripeConnectAccountId: result.accountId },
    });
  }

  // return URL을 온보딩으로 돌리기 위해 refresh URL 별도 생성
  const { getAppOrigin, getStripe, isStripeConfigured } = await import("@/lib/stripe");
  if (isStripeConfigured()) {
    const stripe = getStripe();
    const origin = getAppOrigin();
    const link = await stripe.accountLinks.create({
      account: result.accountId,
      refresh_url: `${origin}/market/seller/register?connect=refresh`,
      return_url: `${origin}/market/seller/register?connect=return`,
      type: "account_onboarding",
    });
    await db.marketplaceSellerProfile.update({
      where: { id: profile.id },
      data: { onboardingStep: "SETTLEMENT" },
    });
    return { url: link.url };
  }

  return { url: result.url };
}

export async function skipSellerSettlementForNow() {
  const user = await requireAuth();
  await db.marketplaceSellerProfile.updateMany({
    where: { userId: user.id },
    data: { onboardingStep: "SETTLEMENT" },
  });
  return completeSellerOnboarding();
}

export async function markSellerConnectReturn() {
  const user = await requireAuth();
  await db.user.update({
    where: { id: user.id },
    data: { stripeConnectOnboardedAt: new Date() },
  });
  await db.marketplaceSellerProfile.updateMany({
    where: { userId: user.id },
    data: { onboardingStep: "SETTLEMENT" },
  });
  return completeSellerOnboarding();
}

export async function completeSellerOnboarding() {
  const user = await requireAuth();
  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: {
      emailVerified: true,
      phoneVerified: true,
      marketplaceSeller: true,
    },
  });
  if (!dbUser?.emailVerified) return { error: "이메일 인증이 필요합니다." };
  if (!dbUser.phoneVerified) return { error: "휴대폰 인증이 필요합니다." };
  if (!dbUser.marketplaceSeller?.agreedTermsAt || !dbUser.marketplaceSeller.agreedPrivacyAt) {
    return { error: "필수 약관 동의가 필요합니다." };
  }
  if (!dbUser.marketplaceSeller.sellerType) {
    return { error: "판매자 정보(개인/사업자)를 입력해 주세요." };
  }

  const now = new Date();
  await db.marketplaceSellerProfile.update({
    where: { userId: user.id },
    data: {
      status: "APPROVED",
      onboardingStep: "COMPLETE",
      onboardingCompletedAt: now,
      canList: true,
    },
  });

  revalidatePath("/market/seller");
  revalidatePath("/market/seller/register");
  return { success: true as const, redirectTo: "/market/seller" };
}

export async function resumeSellerConnectFromOnboarding() {
  const user = await requireAuth();
  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { stripeConnectAccountId: true },
  });
  if (!dbUser?.stripeConnectAccountId) {
    return startSellerSettlementOnboarding();
  }
  const { getAppOrigin, getStripe, isStripeConfigured } = await import("@/lib/stripe");
  if (!isStripeConfigured()) return { error: "Stripe가 설정되지 않았습니다." };
  const stripe = getStripe();
  const origin = getAppOrigin();
  const link = await stripe.accountLinks.create({
    account: dbUser.stripeConnectAccountId,
    refresh_url: `${origin}/market/seller/register?connect=refresh`,
    return_url: `${origin}/market/seller/register?connect=return`,
    type: "account_onboarding",
  });
  return { url: link.url };
}
