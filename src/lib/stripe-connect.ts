import { getAppOrigin, getStripe, isStripeConfigured } from "@/lib/stripe";
import { db } from "@/lib/db";

export function isStripeConnectConfigured(): boolean {
  return isStripeConfigured();
}

/** Stripe Connect payout ready — tax/KYC delegated to Stripe onboarding */
export async function isStripeConnectPayoutReady(
  accountId: string | null | undefined
): Promise<boolean> {
  if (!accountId || !isStripeConfigured()) return false;
  try {
    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(accountId);
    const eventuallyDue = account.requirements?.eventually_due ?? [];
    return eventuallyDue.length === 0;
  } catch {
    return false;
  }
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
      message: "판매자 Stripe Connect 온보딩이 필요합니다.",
    };
  }
  const ready = await isStripeConnectPayoutReady(accountId);
  return {
    ready,
    message: ready
      ? "Stripe Connect 정산이 활성화되었습니다."
      : "Stripe Connect에서 추가 정보 제출이 필요합니다.",
  };
}

/** @deprecated Prefer stripeConnectStatusFromApi for accurate requirements check */
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

/** After Connect return URL — sync onboardedAt only when Stripe requirements are clear */
export async function syncStripeConnectOnboardedAt(userId: string, accountId: string) {
  const ready = await isStripeConnectPayoutReady(accountId);
  if (!ready) {
    return { ready: false as const };
  }
  await db.user.update({
    where: { id: userId },
    data: { stripeConnectOnboardedAt: new Date() },
  });
  return { ready: true as const };
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

/** Apick 1원 인증 완료 후 Custom Connect 계정 생성 */
export async function createCustomConnectAccount(input: {
  userId: string;
  email?: string | null;
  legalName: string;
}) {
  if (!isStripeConfigured()) {
    return { error: "Stripe가 설정되지 않았습니다." as const };
  }

  const stripe = getStripe();
  const account = await stripe.accounts.create({
    type: "custom",
    country: "KR",
    email: input.email ?? undefined,
    business_type: "individual",
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: { mocomoUserId: input.userId },
    individual: {
      email: input.email ?? undefined,
      first_name: input.legalName.slice(0, 40),
    },
  });

  return { accountId: account.id };
}

/** 검증된 한국 계좌를 Connect external_account 로 등록 */
export async function attachKrBankToConnectAccount(input: {
  accountId: string;
  bankCode: string;
  accountNum: string;
  holderName: string;
}) {
  if (!isStripeConfigured()) {
    return { error: "Stripe가 설정되지 않았습니다." as const };
  }

  const stripe = getStripe();
  try {
    await stripe.accounts.createExternalAccount(input.accountId, {
      external_account: {
        object: "bank_account",
        country: "KR",
        currency: "krw",
        account_holder_name: input.holderName,
        account_holder_type: "individual",
        routing_number: input.bankCode,
        account_number: input.accountNum,
      },
    });
    return { ok: true as const };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe 계좌 등록 실패";
    console.error("[stripe-connect] attachKrBank failed:", msg);
    return { error: msg };
  }
}
