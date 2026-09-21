import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { db } from "@/lib/db";
import {
  snapshotStripeConnectAccount,
  syncStripeConnectAccountToDb,
} from "@/lib/marketplace/stripe-connect-sync";
import type { TaxFormType } from "@/lib/settlement-moco/constants";

export function isStripeConnectConfigured(): boolean {
  return isStripeConfigured();
}

/** @deprecated Custom Connect 타입 — Express 표준화 후 신규 사용 금지 */
export type CustomConnectInput = {
  userId: string;
  email?: string | null;
  countryCode: string;
  legalName: string;
  dateOfBirth: { year: number; month: number; day: number };
  address: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode: string;
  };
  bank: {
    accountNumber: string;
    accountHolderName: string;
    bankCode?: string;
    routingNumber?: string;
  };
  taxFormType: TaxFormType;
  ssn?: string;
  tosAcceptance: { ip: string; date: number };
  requestCardPayments?: boolean;
};

/**
 * @deprecated Custom Connect 화이트라벨은 제거됨. Express 온보딩 사용.
 * 호출 시 즉시 에러를 반환합니다.
 */
export async function createCustomConnectAccount(
  _input: CustomConnectInput
): Promise<{ accountId: string } | { error: string }> {
  void _input;
  return {
    error:
      "Custom Connect 계정 생성은 더 이상 지원하지 않습니다. Stripe Express 온보딩을 이용해 주세요.",
  };
}

/**
 * @deprecated Custom Connect 화이트라벨은 제거됨. Express 온보딩 사용.
 */
export async function updateCustomConnectAccount(
  _accountId: string,
  _input: Omit<CustomConnectInput, "userId" | "requestCardPayments">
): Promise<{ ok: true } | { error: string }> {
  void _accountId;
  void _input;
  return {
    error:
      "Custom Connect 계정 갱신은 더 이상 지원하지 않습니다. Stripe Express 온보딩을 이용해 주세요.",
  };
}

/** @deprecated settlement-express-connect.ensureExpressConnectAccount */
export async function createExpressConnectAccount(input: {
  userId: string;
  email?: string | null;
  countryCode: string;
  requestCardPayments?: boolean;
}): Promise<{ accountId: string } | { error: string }> {
  const { ensureExpressConnectAccount } = await import("@/lib/settlement-express-connect");
  return ensureExpressConnectAccount(input.userId, {
    requestCardPayments: input.requestCardPayments,
  });
}

export async function createSellerAccountOnboardingLink(input: { accountId: string }) {
  const { createExpressOnboardingLink } = await import("@/lib/settlement-express-connect");
  return createExpressOnboardingLink(input.accountId);
}

export async function startSellerConnectOnboarding(input: {
  userId: string;
  email?: string | null;
  stripeConnectAccountId?: string | null;
  countryCode: string;
  requestCardPayments?: boolean;
}): Promise<{ accountId: string; url: string } | { error: string }> {
  const { startExpressConnectOnboarding } = await import("@/lib/settlement-express-connect");
  const result = await startExpressConnectOnboarding(input.userId, {
    requestCardPayments: input.requestCardPayments,
  });
  if ("error" in result) return result;
  return { accountId: result.accountId, url: result.url };
}

export async function refreshSellerConnectLink(accountId: string) {
  return createSellerAccountOnboardingLink({ accountId });
}

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
      message: "Stripe 설정 후 Reward 정산이 가능합니다.",
    };
  }
  if (!accountId) {
    return {
      ready: false,
      message: "정산 등록이 필요합니다.",
    };
  }
  const snap = await pullAndSyncStripeConnectAccount(accountId);
  if (!snap) {
    return {
      ready: false,
      message: "정산 상태를 확인할 수 없습니다.",
    };
  }
  const { stripeConnectStatusLabel } = await import("@/lib/marketplace/stripe-connect-sync");
  return {
    ready: snap.readyForPayouts,
    message: stripeConnectStatusLabel(snap.onboardingStatus, snap.requirementsDue),
    snapshot: snap,
  };
}

export function stripeConnectStatus(accountId: string | null | undefined) {
  if (!isStripeConnectConfigured()) {
    return {
      ready: false,
      message: "Stripe 설정 후 Reward 정산이 가능합니다.",
    };
  }
  if (!accountId) {
    return {
      ready: false,
      message: "정산 등록이 필요합니다.",
    };
  }
  return {
    ready: true,
    message: "정산 계좌가 등록되어 있습니다.",
  };
}

export async function syncStripeConnectOnboardedAt(userId: string, accountId: string) {
  const snap = await pullAndSyncStripeConnectAccount(accountId);
  if (!snap?.readyForPayouts) {
    return { ready: false as const, snapshot: snap };
  }

  await db.creatorSettlementProfile.updateMany({
    where: { userId },
    data: { payoutsEnabled: true, registeredAt: new Date() },
  });

  return { ready: true as const, snapshot: snap };
}

/** @deprecated Custom Connect 제거 — Express Hosted Onboarding 사용 */
export async function attachKrBankToConnectAccount(_input: {
  accountId: string;
  bankCode: string;
  accountNum: string;
  holderName: string;
}): Promise<{ ok: true } | { error: string }> {
  void _input;
  return {
    error:
      "앱 내 계좌 바인딩은 더 이상 지원하지 않습니다. Stripe Express 온보딩에서 계좌를 등록해 주세요.",
  };
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
