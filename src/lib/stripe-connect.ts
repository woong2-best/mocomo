import { getAppOrigin, getStripe, isStripeConfigured } from "@/lib/stripe";

export function isStripeConnectConfigured(): boolean {
  return isStripeConfigured();
}

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

/** Express Connected Account 생성 + Account Link */
export async function createSellerConnectOnboarding(user: {
  id: string;
  email?: string | null;
  stripeConnectAccountId?: string | null;
}) {
  if (!isStripeConfigured()) {
    return { error: "Stripe가 설정되지 않았습니다." as const };
  }

  const stripe = getStripe();
  let accountId = user.stripeConnectAccountId ?? null;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: user.email ?? undefined,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: { mocomoUserId: user.id },
    });
    accountId = account.id;
  }

  const origin = getAppOrigin();
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/market/seller?connect=refresh`,
    return_url: `${origin}/market/seller?connect=return`,
    type: "account_onboarding",
  });

  return { accountId, url: link.url };
}

export async function refreshSellerConnectLink(accountId: string) {
  if (!isStripeConfigured()) {
    return { error: "Stripe가 설정되지 않았습니다." as const };
  }
  const stripe = getStripe();
  const origin = getAppOrigin();
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/market/seller?connect=refresh`,
    return_url: `${origin}/market/seller?connect=return`,
    type: "account_onboarding",
  });
  return { url: link.url };
}
