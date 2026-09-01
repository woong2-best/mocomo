import { getAppOrigin, getStripe, isStripeConfigured } from "@/lib/stripe";
import { db } from "@/lib/db";
import { normalizeSellerCountry, isKrSellerCountry } from "@/lib/marketplace/seller-region-policy";
import {
  snapshotStripeConnectAccount,
  syncStripeConnectAccountToDb,
} from "@/lib/marketplace/stripe-connect-sync";
import type Stripe from "stripe";

export function isStripeConnectConfigured(): boolean {
  return isStripeConfigured();
}

export type SellerConnectUrlContext = {
  fromApp?: boolean;
  returnTo?: string | null;
};

export function buildSellerConnectRedirectPaths(ctx: SellerConnectUrlContext = {}) {
  const origin = getAppOrigin();
  const params = new URLSearchParams();
  if (ctx.fromApp) params.set("app", "1");
  if (ctx.returnTo) params.set("return", ctx.returnTo);
  const q = params.toString();
  const suffix = q ? `?${q}` : "";
  const amp = q ? `&${q}` : "";
  return {
    refresh_url: `${origin}/api/market/seller/stripe-connect/refresh${suffix}`,
    return_url: `${origin}/market/seller/register?connect=return${amp}`,
  };
}

/** KR=recipient(transfers only) / 그 외=full(default) Express 계정 생성 */
export async function createExpressConnectAccount(input: {
  userId: string;
  email?: string | null;
  countryCode: string;
}): Promise<{ accountId: string } | { error: string }> {
  if (!isStripeConfigured()) {
    return { error: "Stripe가 설정되지 않았습니다." };
  }

  const country = normalizeSellerCountry(input.countryCode).toUpperCase();
  const isKr = isKrSellerCountry(country);
  const stripe = getStripe();

  const params: Stripe.AccountCreateParams = {
    type: "express",
    country,
    email: input.email?.trim() || undefined,
    metadata: { mocomoUserId: input.userId },
    capabilities: {
      transfers: { requested: true },
    },
  };

  if (isKr) {
    params.tos_acceptance = { service_agreement: "recipient" };
  }

  try {
    const account = await stripe.accounts.create(params);
    return { accountId: account.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe 계정 생성 실패";
    console.error("[stripe-connect] createExpressConnectAccount:", msg);
    return { error: msg };
  }
}

/** Express Account Link (account_onboarding) */
export async function createSellerAccountOnboardingLink(input: {
  accountId: string;
  urlContext?: SellerConnectUrlContext;
}): Promise<{ url: string } | { error: string }> {
  if (!isStripeConfigured()) {
    return { error: "Stripe가 설정되지 않았습니다." };
  }

  const stripe = getStripe();
  const paths = buildSellerConnectRedirectPaths(input.urlContext);

  try {
    const link = await stripe.accountLinks.create({
      account: input.accountId,
      refresh_url: paths.refresh_url,
      return_url: paths.return_url,
      type: "account_onboarding",
    });
    return { url: link.url };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe 온보딩 링크 생성 실패";
    console.error("[stripe-connect] createSellerAccountOnboardingLink:", msg);
    return { error: msg };
  }
}

/** 계정 생성(없으면) + Account Link — 이메일만 프리필 */
export async function startSellerConnectOnboarding(input: {
  userId: string;
  email?: string | null;
  stripeConnectAccountId?: string | null;
  countryCode: string;
  urlContext?: SellerConnectUrlContext;
}): Promise<{ accountId: string; url: string } | { error: string }> {
  if (!isStripeConnectConfigured()) {
    return { error: "Stripe가 설정되지 않았습니다." };
  }

  let accountId = input.stripeConnectAccountId ?? null;

  if (!accountId) {
    const created = await createExpressConnectAccount({
      userId: input.userId,
      email: input.email,
      countryCode: input.countryCode,
    });
    if ("error" in created) return created;
    accountId = created.accountId;

    await db.user.update({
      where: { id: input.userId },
      data: { stripeConnectAccountId: accountId },
    });

    await db.marketplaceSellerProfile.updateMany({
      where: { userId: input.userId },
      data: {
        stripeConnectStartedAt: new Date(),
        onboardingStep: "SETTLEMENT",
      },
    });
  }

  const link = await createSellerAccountOnboardingLink({
    accountId,
    urlContext: input.urlContext,
  });
  if ("error" in link) return link;

  return { accountId, url: link.url };
}

export async function refreshSellerConnectLink(
  accountId: string,
  urlContext?: SellerConnectUrlContext
) {
  return createSellerAccountOnboardingLink({ accountId, urlContext });
}

/** Stripe API에서 계정 상태 조회 후 DB 동기화 */
export async function pullAndSyncStripeConnectAccount(
  accountId: string
): Promise<ReturnType<typeof snapshotStripeConnectAccount> | null> {
  if (!isStripeConfigured()) return null;
  try {
    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(accountId);
    await syncStripeConnectAccountToDb(account);
    return snapshotStripeConnectAccount(account);
  } catch {
    return null;
  }
}

/** @deprecated webhook·pullAndSyncStripeConnectAccount 사용 */
export async function isStripeConnectPayoutReady(
  accountId: string | null | undefined
): Promise<boolean> {
  if (!accountId || !isStripeConfigured()) return false;
  const snap = await pullAndSyncStripeConnectAccount(accountId);
  return snap?.readyForPayouts ?? false;
}

export async function stripeConnectStatusFromApi(accountId: string | null | undefined) {
  if (!isStripeConnectConfigured()) {
    return {
      ready: false,
      message: "Stripe 설정 후 Connect 판매자 정산이 가능합니다.",
    };
  }
  if (!accountId) {
    return {
      ready: false,
      message: "Stripe Connect 온보딩이 필요합니다.",
    };
  }
  const snap = await pullAndSyncStripeConnectAccount(accountId);
  if (!snap) {
    return {
      ready: false,
      message: "Stripe Connect 상태를 확인할 수 없습니다.",
    };
  }
  const { stripeConnectStatusLabel } = await import("@/lib/marketplace/stripe-connect-sync");
  return {
    ready: snap.readyForPayouts,
    message: stripeConnectStatusLabel(snap.onboardingStatus, snap.requirementsDue),
    snapshot: snap,
  };
}

/** @deprecated Prefer stripeConnectStatusFromApi */
export function stripeConnectStatus(accountId: string | null | undefined) {
  if (!isStripeConnectConfigured()) {
    return {
      ready: false,
      message: "Stripe 설정 후 Connect 판매자 정산이 가능합니다.",
    };
  }
  if (!accountId) {
    return {
      ready: false,
      message: "판매자 Stripe Connect 온보딩이 필요합니다.",
    };
  }
  return {
    ready: true,
    message: "Connect 계정이 연결되어 있습니다.",
  };
}

/** Connect return URL — Stripe 상태 pull 후 동기화 */
export async function syncStripeConnectOnboardedAt(userId: string, accountId: string) {
  const snap = await pullAndSyncStripeConnectAccount(accountId);
  if (!snap?.readyForPayouts) {
    return { ready: false as const, snapshot: snap };
  }
  return { ready: true as const, snapshot: snap };
}

/** @deprecated Custom Connect — Stripe Hosted Onboarding으로 대체 */
export async function createCustomConnectAccount(_input: {
  userId: string;
  email?: string | null;
  legalName: string;
}) {
  return { error: "Custom Connect는 더 이상 지원되지 않습니다." as const };
}

/** @deprecated Custom Connect — Stripe Hosted Onboarding으로 대체 */
export async function attachKrBankToConnectAccount(_input: {
  accountId: string;
  bankCode: string;
  accountNum: string;
  holderName: string;
}) {
  return { error: "Custom Connect는 더 이상 지원되지 않습니다." as const };
}

/** @deprecated startSellerConnectOnboarding 사용 */
export async function createSellerConnectOnboarding(user: {
  id: string;
  email?: string | null;
  stripeConnectAccountId?: string | null;
}) {
  return startSellerConnectOnboarding({
    userId: user.id,
    email: user.email,
    stripeConnectAccountId: user.stripeConnectAccountId,
    countryCode: "US",
  });
}
