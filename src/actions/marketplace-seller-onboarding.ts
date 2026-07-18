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
import {
  isKrSellerCountry,
  normalizeSellerCountry,
  sellerRequiresPhoneVerification,
} from "@/lib/marketplace/seller-region-policy";
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
  phoneCountryCode: z.string().min(2).max(8).optional(),
  phone: z.string().max(40).optional(),
  phoneProof: z.string().optional(),
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

const kycSchema = z.object({
  legalName: z.string().min(1).max(120),
  idType: z.enum(["NATIONAL_ID", "PASSPORT", "DRIVERS_LICENSE", "RESIDENT_CARD"]),
  idNumber: z.string().min(4).max(80),
});

async function getSessionUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

function resolveNextAfterAgreements(input: {
  emailVerified: boolean;
  phoneVerified: boolean;
  countryCode: string;
  hasSellerType: boolean;
  kycStarted: boolean;
}): MarketplaceSellerOnboardingStep {
  if (!input.emailVerified) return "EMAIL";
  if (sellerRequiresPhoneVerification(input.countryCode) && !input.phoneVerified) {
    return "PHONE";
  }
  if (!input.hasSellerType) return "SELLER_INFO";
  if (!input.kycStarted) return "KYC";
  return "SETTLEMENT";
}

export async function getSellerOnboardingState() {
  const session = await auth();
  if (!session?.user?.id) {
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
      phoneRequired: true,
      connectReady: false,
      profile: null,
    };
  }

  const profile = user.marketplaceSeller;
  const country = normalizeSellerCountry(
    profile?.sellingMarket || profile?.phoneCountryCode || user.countryCode
  );
  const phoneRequired = sellerRequiresPhoneVerification(country);
  const kycStarted =
    !!profile && profile.kycStatus !== "NOT_STARTED" && profile.kycStatus !== "DEFERRED";
  const settlementReady = !!(
    user.stripeConnectOnboardedAt ||
    user.stripeConnectAccountId ||
    profile?.settlementDeclaredAt
  );

  let step: SellerOnboardingStepId = "AGREEMENTS";

  if (profile?.onboardingCompletedAt) {
    step = "COMPLETE";
  } else if (!user.emailVerified) {
    step = "EMAIL";
  } else if (!profile?.agreedTermsAt || !profile?.agreedPrivacyAt || !profile?.agreedAgeAt) {
    step = "AGREEMENTS";
  } else if (phoneRequired && !user.phoneVerified) {
    step = "PHONE";
  } else if (!profile.sellerType) {
    step = "SELLER_INFO";
  } else if (!kycStarted) {
    step = "KYC";
  } else if (!settlementReady) {
    step = "SETTLEMENT";
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
    phoneRequired,
    phone: user.phone,
    countryCode: country,
    phoneCountryCode: profile?.phoneCountryCode ?? (phoneRequired ? "KR" : country),
    sellingMarket: profile?.sellingMarket ?? country,
    connectReady: !!(user.stripeConnectOnboardedAt || user.stripeConnectAccountId),
    settlementDeclared: !!profile?.settlementDeclaredAt,
    stripeConfigured: isStripeConnectConfigured(),
    isKr: isKrSellerCountry(country),
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
          kycIdType: profile.kycIdType,
          kycLegalName: profile.kycLegalName,
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

  const sellingMarket = normalizeSellerCountry(data.sellingMarket);
  const phoneRequired = sellerRequiresPhoneVerification(sellingMarket);
  const phoneCountry = phoneRequired
    ? "KR"
    : normalizeSellerCountry(data.phoneCountryCode || sellingMarket);

  let phoneE164: string | null = null;
  if (phoneRequired) {
    if (!data.phone?.trim() || !data.phoneProof) {
      return { error: "한국 판매자는 휴대폰(SMS) 인증이 필수입니다." };
    }
    if (!isSellerPhoneCountry("KR")) {
      return { error: "휴대폰 국가 설정 오류입니다." };
    }
    phoneE164 = normalizeMobilePhone(data.phone, "KR");
    if (!phoneE164) return { error: "휴대폰 번호 형식이 올바르지 않습니다." };
  }

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
    turnstileToken: data.turnstileToken,
    turnstileUnavailable: data.turnstileUnavailable ?? !isSignupHumanVerifyRequired(),
    humanChallengeToken: data.humanChallengeToken,
    humanChallengeAnswer: data.humanChallengeAnswer,
  });

  if (result.error) return { error: result.error };
  if (!result.userId) return { error: "계정 생성에 실패했습니다." };

  if (phoneRequired && phoneE164 && data.phoneProof) {
    const phoneAttach = await consumeSellerPhoneProof(phoneE164, data.phoneProof, result.userId);
    if (!phoneAttach.ok) {
      return { error: phoneAttach.error, userId: result.userId, email: data.email.trim().toLowerCase() };
    }
  }

  await db.marketplaceSellerProfile.upsert({
    where: { userId: result.userId },
    create: {
      userId: result.userId,
      displayName: data.name.trim().slice(0, 80),
      sellingMarket,
      phoneCountryCode: phoneRequired ? "KR" : phoneCountry,
      onboardingStep: "EMAIL",
      status: "PENDING",
      canList: false,
    },
    update: {
      displayName: data.name.trim().slice(0, 80),
      sellingMarket,
      phoneCountryCode: phoneRequired ? "KR" : phoneCountry,
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
    phoneVerified: phoneRequired,
    phoneRequired,
  };
}

export async function saveSellerAgreements(input: z.infer<typeof agreementsSchema>) {
  const limited = await limitSellerAction("agreements");
  if (!limited.ok) return { error: limited.error };

  const parsed = agreementsSchema.safeParse(input);
  if (!parsed.success) return { error: "필수 약관에 모두 동의해 주세요." };

  const user = await requireAuth();
  const now = new Date();

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: {
      emailVerified: true,
      phoneVerified: true,
      countryCode: true,
      marketplaceSeller: true,
    },
  });

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

  const next = resolveNextAfterAgreements({
    emailVerified: !!dbUser?.emailVerified,
    phoneVerified: !!dbUser?.phoneVerified,
    countryCode: country,
    hasSellerType: !!profile.sellerType,
    kycStarted: profile.kycStatus !== "NOT_STARTED" && profile.kycStatus !== "DEFERRED",
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
  const user = sessionUser
    ? await db.user.findUnique({
        where: { id: sessionUser },
        select: {
          id: true,
          phoneVerified: true,
          countryCode: true,
          marketplaceSeller: true,
        },
      })
    : await db.user.findFirst({
        where: { email: email.trim().toLowerCase() },
        select: {
          id: true,
          phoneVerified: true,
          countryCode: true,
          marketplaceSeller: true,
        },
      });

  if (user) {
    const country = normalizeSellerCountry(
      user.marketplaceSeller?.sellingMarket || user.countryCode
    );
    const next = !user.marketplaceSeller?.agreedTermsAt
      ? ("AGREEMENTS" as const)
      : resolveNextAfterAgreements({
          emailVerified: true,
          phoneVerified: !!user.phoneVerified,
          countryCode: country,
          hasSellerType: !!user.marketplaceSeller?.sellerType,
          kycStarted:
            !!user.marketplaceSeller &&
            user.marketplaceSeller.kycStatus !== "NOT_STARTED" &&
            user.marketplaceSeller.kycStatus !== "DEFERRED",
        });
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
  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: {
      phoneVerified: true,
      countryCode: true,
      marketplaceSeller: { select: { sellingMarket: true } },
    },
  });
  const country = normalizeSellerCountry(
    dbUser?.marketplaceSeller?.sellingMarket || dbUser?.countryCode
  );
  if (!sellerRequiresPhoneVerification(country)) {
    await db.marketplaceSellerProfile.updateMany({
      where: { userId: user.id },
      data: { onboardingStep: "SELLER_INFO" },
    });
    return { success: true as const, nextStep: "SELLER_INFO" as const };
  }
  if (!isSellerPhoneCountry(phoneCountryCode) && phoneCountryCode.toUpperCase() !== "KR") {
    return { error: "한국 판매자는 KR 휴대폰 번호로 인증해 주세요." };
  }
  if (!dbUser?.phoneVerified) {
    return { error: "휴대폰 인증을 완료해 주세요." };
  }

  await db.marketplaceSellerProfile.updateMany({
    where: { userId: user.id },
    data: {
      phoneCountryCode: "KR",
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
      canList: false,
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

/** KYC 필수 제출 — 연기(DEFERRED) 불가. 관리자 검토용 PENDING */
export async function submitSellerKyc(input: z.infer<typeof kycSchema>) {
  const limited = await limitSellerAction("kyc");
  if (!limited.ok) return { error: limited.error };

  const parsed = kycSchema.safeParse(input);
  if (!parsed.success) return { error: "본인 확인 정보를 입력해 주세요." };

  const user = await requireAuth();
  const now = new Date();
  const id = parsed.data.idNumber.replace(/\s+/g, "");
  const hint = id.length <= 4 ? id : id.slice(-4);

  await db.marketplaceSellerProfile.updateMany({
    where: { userId: user.id },
    data: {
      kycStatus: "PENDING",
      kycSubmittedAt: now,
      kycLegalName: parsed.data.legalName.trim().slice(0, 120),
      kycIdType: parsed.data.idType,
      kycIdHint: hint,
      kycNotes: `신분증 유형 ${parsed.data.idType} 제출 · 관리자 검토 대기`,
      onboardingStep: "SETTLEMENT",
    },
  });

  revalidatePath("/market/seller/register");
  return { success: true as const, nextStep: "SETTLEMENT" as const };
}

/** @deprecated — defer 제거. submitSellerKyc 사용 */
export async function submitSellerKycPrep(mode: "defer" | "start") {
  if (mode === "defer") {
    return { error: "본인 확인(KYC)은 필수입니다. 신분증 정보를 제출해 주세요." };
  }
  return { error: "법적 성명·신분증 유형·번호를 입력해 제출해 주세요." };
}

export async function startSellerSettlementOnboarding() {
  const user = await requireAuth();
  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, stripeConnectAccountId: true },
  });
  if (!dbUser) return { error: "사용자를 찾을 수 없습니다." };

  const profile = await db.marketplaceSellerProfile.findUnique({ where: { userId: user.id } });
  if (!profile) return { error: "판매자 프로필을 먼저 생성해 주세요." };

  if (!isStripeConnectConfigured()) {
    return {
      error:
        "Stripe Connect가 아직 설정되지 않았습니다. 아래 ‘정산 계좌 등록 완료(검토 요청)’로 진행해 주세요.",
      stripeUnavailable: true as const,
    };
  }

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

/** Stripe 미설정·보류 시에도 정산 등록 의사를 기록하고 온보딩 완료 가능 */
export async function declareSellerSettlementForReview(note?: string) {
  const user = await requireAuth();
  const now = new Date();
  await db.marketplaceSellerProfile.updateMany({
    where: { userId: user.id },
    data: {
      settlementDeclaredAt: now,
      onboardingStep: "SETTLEMENT",
      ...(note?.trim()
        ? { kycNotes: `정산 검토 요청: ${note.trim().slice(0, 500)}` }
        : {}),
    },
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
    data: {
      onboardingStep: "SETTLEMENT",
      settlementDeclaredAt: new Date(),
    },
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
      countryCode: true,
      stripeConnectAccountId: true,
      stripeConnectOnboardedAt: true,
      marketplaceSeller: true,
    },
  });
  if (!dbUser?.emailVerified) return { error: "이메일 인증이 필요합니다." };
  if (!dbUser.marketplaceSeller?.agreedTermsAt || !dbUser.marketplaceSeller.agreedPrivacyAt) {
    return { error: "판매자 이용약관 및 개인정보 처리방침 동의가 필요합니다." };
  }

  const country = normalizeSellerCountry(
    dbUser.marketplaceSeller.sellingMarket || dbUser.countryCode
  );
  if (sellerRequiresPhoneVerification(country) && !dbUser.phoneVerified) {
    return { error: "한국 판매자는 휴대폰(SMS) 인증이 필수입니다." };
  }
  if (!dbUser.marketplaceSeller.sellerType) {
    return { error: "판매자 정보(개인/사업자)를 입력해 주세요." };
  }
  const kyc = dbUser.marketplaceSeller.kycStatus;
  if (kyc === "NOT_STARTED" || kyc === "DEFERRED" || kyc === "FAILED") {
    return { error: "본인 확인(KYC)을 제출해 주세요." };
  }

  const settlementReady = !!(
    dbUser.stripeConnectOnboardedAt ||
    dbUser.stripeConnectAccountId ||
    dbUser.marketplaceSeller.settlementDeclaredAt
  );
  if (!settlementReady) {
    return { error: "정산 계좌 등록(또는 검토 요청)이 필요합니다." };
  }

  const now = new Date();
  await db.marketplaceSellerProfile.update({
    where: { userId: user.id },
    data: {
      status: "PENDING",
      onboardingStep: "COMPLETE",
      onboardingCompletedAt: now,
      canList: false,
    },
  });

  revalidatePath("/market/seller");
  revalidatePath("/market/seller/register");
  revalidatePath("/admin/market");
  return { success: true as const, redirectTo: "/market/seller?welcome=1" };
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
  if (!isStripeConfigured()) {
    return declareSellerSettlementForReview("Stripe 미설정 — 관리자 정산 검토");
  }
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
