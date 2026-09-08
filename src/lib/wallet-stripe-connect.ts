import { getAppOrigin, getStripe, isStripeConfigured } from "@/lib/stripe";
import { db } from "@/lib/db";
import { createExpressConnectAccount } from "@/lib/stripe-connect";
import type Stripe from "stripe";

export type WalletConnectUrlContext = {
  fromApp?: boolean;
  returnTo?: string | null;
};

export function buildWalletConnectRedirectPaths(ctx: WalletConnectUrlContext = {}) {
  const origin = getAppOrigin();
  const params = new URLSearchParams();
  if (ctx.fromApp) params.set("app", "1");
  if (ctx.returnTo) params.set("return", ctx.returnTo);
  const q = params.toString();
  const suffix = q ? `?${q}` : "";
  const amp = q ? `&${q}` : "";
  return {
    refresh_url: `${origin}/api/stripe/connect/refresh${suffix}`,
    return_url: `${origin}/wallet?tab=earnings&connect=return${amp}`,
  };
}

export async function createWalletAccountOnboardingLink(input: {
  accountId: string;
  urlContext?: WalletConnectUrlContext;
}): Promise<{ url: string } | { error: string }> {
  if (!isStripeConfigured()) {
    return { error: "Stripe가 설정되지 않았습니다." };
  }

  const stripe = getStripe();
  const paths = buildWalletConnectRedirectPaths(input.urlContext);

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
    console.error("[wallet-stripe-connect] createWalletAccountOnboardingLink:", msg);
    return { error: msg };
  }
}

/** Express 계정 생성(없으면) + Account Link — 지갑 수익 정산용 */
export async function startWalletStripeConnectOnboarding(input: {
  userId: string;
  email?: string | null;
  countryCode: string;
  stripeConnectAccountId?: string | null;
  urlContext?: WalletConnectUrlContext;
}): Promise<{ accountId: string; url: string } | { error: string }> {
  if (!isStripeConfigured()) {
    return { error: "Stripe가 설정되지 않았습니다." };
  }

  let accountId = input.stripeConnectAccountId?.trim() || null;

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
  }

  const link = await createWalletAccountOnboardingLink({
    accountId,
    urlContext: input.urlContext,
  });
  if ("error" in link) return link;

  return { accountId, url: link.url };
}

export async function refreshWalletConnectLink(
  accountId: string,
  urlContext?: WalletConnectUrlContext
) {
  return createWalletAccountOnboardingLink({ accountId, urlContext });
}

/** Express Dashboard login link — 정산 계좌/내역 관리 */
export async function createWalletConnectDashboardLink(
  accountId: string
): Promise<{ url: string } | { error: string }> {
  if (!isStripeConfigured()) {
    return { error: "Stripe가 설정되지 않았습니다." };
  }

  const stripe = getStripe();
  try {
    const link = await stripe.accounts.createLoginLink(accountId);
    return { url: link.url };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe 대시보드 링크 생성 실패";
    console.error("[wallet-stripe-connect] createWalletConnectDashboardLink:", msg);
    return { error: msg };
  }
}

export type WalletStripeConnectStatus = {
  stripeConnectAccountId: string | null;
  stripeOnboardingCompleted: boolean;
};

export async function getWalletStripeConnectStatus(
  userId: string
): Promise<WalletStripeConnectStatus> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      stripeConnectAccountId: true,
      stripeOnboardingCompleted: true,
    },
  });
  return {
    stripeConnectAccountId: user?.stripeConnectAccountId ?? null,
    stripeOnboardingCompleted: !!user?.stripeOnboardingCompleted,
  };
}
