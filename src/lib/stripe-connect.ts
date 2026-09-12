import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { db } from "@/lib/db";
import { normalizeSellerCountry, isKrSellerCountry } from "@/lib/marketplace/seller-region-policy";
import {
  snapshotStripeConnectAccount,
  syncStripeConnectAccountToDb,
} from "@/lib/marketplace/stripe-connect-sync";
import type { TaxFormType } from "@/lib/settlement-moco/constants";
import type Stripe from "stripe";

export function isStripeConnectConfigured(): boolean {
  return isStripeConfigured();
}

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
  /** 마켓플레이스 판매자 — destination charge용 */
  requestCardPayments?: boolean;
};

function splitLegalName(name: string): { first: string; last: string } {
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { first: parts[0]!, last: parts[0]! };
  const last = parts.pop()!;
  return { first: parts.join(" "), last };
}

function bankExternalAccount(input: CustomConnectInput): Stripe.AccountCreateParams.ExternalAccount {
  const country = normalizeSellerCountry(input.countryCode).toUpperCase();
  const currency = country === "KR" ? "krw" : country === "JP" ? "jpy" : "usd";

  return {
    object: "bank_account",
    country,
    currency,
    account_holder_name: input.bank.accountHolderName,
    account_holder_type: "individual",
    account_number: input.bank.accountNumber.replace(/\D/g, ""),
    routing_number: (input.bank.bankCode ?? input.bank.routingNumber ?? "").replace(/\D/g, ""),
  };
}

/** Stripe Connect Custom 계정 생성 + 계좌 바인딩 (화이트라벨) */
export async function createCustomConnectAccount(
  input: CustomConnectInput
): Promise<{ accountId: string } | { error: string }> {
  if (!isStripeConfigured()) {
    return { error: "Stripe가 설정되지 않았습니다." };
  }

  const country = normalizeSellerCountry(input.countryCode).toUpperCase();
  const isKr = isKrSellerCountry(country);
  const stripe = getStripe();
  const { first, last } = splitLegalName(input.legalName);

  const params: Stripe.AccountCreateParams = {
    type: "custom",
    country,
    email: input.email?.trim() || undefined,
    business_type: "individual",
    individual: {
      first_name: first,
      last_name: last,
      email: input.email?.trim() || undefined,
      dob: input.dateOfBirth,
      address: {
        line1: input.address.line1,
        line2: input.address.line2,
        city: input.address.city,
        state: input.address.state,
        postal_code: input.address.postalCode,
        country,
      },
      ...(input.taxFormType === "W9" && input.ssn
        ? { id_number: input.ssn.replace(/\D/g, "") }
        : {}),
    },
    capabilities: {
      transfers: { requested: true },
      ...(input.requestCardPayments ? { card_payments: { requested: true } } : {}),
    },
    tos_acceptance: {
      date: input.tosAcceptance.date,
      ip: input.tosAcceptance.ip,
      ...(isKr ? { service_agreement: "recipient" } : {}),
    },
    external_account: bankExternalAccount(input),
    metadata: { mocomoUserId: input.userId },
  };

  try {
    const account = await stripe.accounts.create(params);
    return { accountId: account.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe Custom 계정 생성 실패";
    console.error("[stripe-connect] createCustomConnectAccount:", msg);
    return { error: msg };
  }
}

/** 기존 Custom 계정에 계좌·KYC 갱신 */
export async function updateCustomConnectAccount(
  accountId: string,
  input: Omit<CustomConnectInput, "userId" | "requestCardPayments">
): Promise<{ ok: true } | { error: string }> {
  if (!isStripeConfigured()) return { error: "Stripe가 설정되지 않았습니다." };

  const country = normalizeSellerCountry(input.countryCode).toUpperCase();
  const isKr = isKrSellerCountry(country);
  const stripe = getStripe();
  const { first, last } = splitLegalName(input.legalName);

  try {
    await stripe.accounts.update(accountId, {
      individual: {
        first_name: first,
        last_name: last,
        dob: input.dateOfBirth,
        address: {
          line1: input.address.line1,
          line2: input.address.line2,
          city: input.address.city,
          state: input.address.state,
          postal_code: input.address.postalCode,
          country,
        },
        ...(input.taxFormType === "W9" && input.ssn
          ? { id_number: input.ssn.replace(/\D/g, "") }
          : {}),
      },
      tos_acceptance: {
        date: input.tosAcceptance.date,
        ip: input.tosAcceptance.ip,
        ...(isKr ? { service_agreement: "recipient" } : {}),
      },
    });

    await stripe.accounts.createExternalAccount(accountId, {
      external_account: bankExternalAccount(input as CustomConnectInput) as Stripe.AccountCreateExternalAccountParams["external_account"],
    });

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe 계정 갱신 실패";
    console.error("[stripe-connect] updateCustomConnectAccount:", msg);
    return { error: msg };
  }
}

/** @deprecated Express 대체 — Custom 등록은 registerCreatorSettlement 사용 */
export async function createExpressConnectAccount(_input: {
  userId: string;
  email?: string | null;
  countryCode: string;
}): Promise<{ accountId: string } | { error: string }> {
  return { error: "Express Connect는 더 이상 지원되지 않습니다. 앱 내 정산 등록을 이용해 주세요." };
}

/** @deprecated Custom 화이트라벨 — Stripe 리다이렉트 없음 */
export async function createSellerAccountOnboardingLink(_input: {
  accountId: string;
}): Promise<{ url: string } | { error: string }> {
  return { error: "Stripe 온보딩 페이지는 사용하지 않습니다. 마이페이지에서 정산 등록을 완료해 주세요." };
}

/** @deprecated registerCreatorSettlement 사용 */
export async function startSellerConnectOnboarding(_input: {
  userId: string;
  email?: string | null;
  stripeConnectAccountId?: string | null;
  countryCode: string;
}): Promise<{ accountId: string; url: string } | { error: string }> {
  return { error: "Stripe 온보딩 페이지는 사용하지 않습니다. 마이페이지에서 정산 등록을 완료해 주세요." };
}

export async function refreshSellerConnectLink(_accountId: string) {
  return createSellerAccountOnboardingLink({ accountId: _accountId });
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

/** KR 계좌 바인딩 — createCustomConnectAccount에 통합됨 */
export async function attachKrBankToConnectAccount(input: {
  accountId: string;
  bankCode: string;
  accountNum: string;
  holderName: string;
}): Promise<{ ok: true } | { error: string }> {
  if (!isStripeConfigured()) return { error: "Stripe가 설정되지 않았습니다." };
  const stripe = getStripe();
  try {
    await stripe.accounts.createExternalAccount(input.accountId, {
      external_account: {
        object: "bank_account",
        country: "KR",
        currency: "krw",
        account_holder_name: input.holderName,
        account_holder_type: "individual",
        routing_number: input.bankCode.replace(/\D/g, ""),
        account_number: input.accountNum.replace(/\D/g, ""),
      },
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "계좌 바인딩 실패";
    return { error: msg };
  }
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
