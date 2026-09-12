import { db } from "@/lib/db";
import { getAppOrigin, getStripe, isStripeConfigured } from "@/lib/stripe";
import { normalizeSellerCountry } from "@/lib/marketplace/seller-region-policy";
import { pullAndSyncStripeConnectAccount } from "@/lib/stripe-connect";
import { resolveTaxFormType } from "@/lib/settlement-moco/tax";
import type Stripe from "stripe";

const PAYOUT_PATH = {
  refresh: "/payouts/refresh",
  success: "/payouts/success",
} as const;

export function payoutConnectUrls() {
  const origin = getAppOrigin();
  return {
    refreshUrl: `${origin}${PAYOUT_PATH.refresh}`,
    returnUrl: `${origin}${PAYOUT_PATH.success}`,
  };
}

async function loadUserConnectRow(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      countryCode: true,
      stripeConnectAccountId: true,
    },
  });
}

/** Stripe Express Connect 계정 확보 (없으면 생성) */
export async function ensureExpressConnectAccount(
  userId: string,
  opts?: { requestCardPayments?: boolean }
): Promise<{ accountId: string } | { error: string }> {
  if (!isStripeConfigured()) {
    return { error: "Stripe가 설정되지 않았습니다." };
  }

  const user = await loadUserConnectRow(userId);
  if (!user) return { error: "사용자를 찾을 수 없습니다." };

  const stripe = getStripe();
  const country = normalizeSellerCountry(user.countryCode).toUpperCase();

  if (user.stripeConnectAccountId) {
    try {
      const existing = await stripe.accounts.retrieve(user.stripeConnectAccountId);
      if (existing.type === "express") {
        return { accountId: existing.id };
      }
      // Legacy Custom 계정 — Express Hosted 온보딩 URL은 Express 전용
      return {
        error:
          "기존 정산 계정 형식과 호환되지 않습니다. 고객센터로 문의해 주세요.",
      };
    } catch {
      // stale id — fall through to create
    }
  }

  try {
    const account = await stripe.accounts.create({
      type: "express",
      country,
      email: user.email?.trim() || undefined,
      capabilities: {
        transfers: { requested: true },
        ...(opts?.requestCardPayments ? { card_payments: { requested: true } } : {}),
      },
      metadata: { mocomoUserId: userId },
    });

    await db.user.update({
      where: { id: userId },
      data: { stripeConnectAccountId: account.id },
    });

    const taxFormType = resolveTaxFormType(country);
    await db.creatorSettlementProfile.upsert({
      where: { userId },
      create: {
        userId,
        countryCode: country,
        legalName: "Stripe 온보딩",
        dateOfBirth: new Date("1990-01-01"),
        addressLine1: "—",
        city: "—",
        postalCode: "—",
        accountNumberLast4: "0000",
        accountHolderName: "—",
        stripeConnectAccountId: account.id,
        taxFormType,
      },
      update: {
        stripeConnectAccountId: account.id,
        countryCode: country,
      },
    });

    return { accountId: account.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe Express 계정 생성 실패";
    console.error("[settlement-express-connect] ensureExpressConnectAccount:", msg);
    return { error: msg };
  }
}

export async function createExpressOnboardingLink(
  accountId: string
): Promise<{ url: string } | { error: string }> {
  if (!isStripeConfigured()) return { error: "Stripe가 설정되지 않았습니다." };

  const { refreshUrl, returnUrl } = payoutConnectUrls();
  const stripe = getStripe();

  try {
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });
    if (!link.url) return { error: "온보딩 링크를 만들 수 없습니다." };
    return { url: link.url };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "온보딩 링크 생성 실패";
    console.error("[settlement-express-connect] createExpressOnboardingLink:", msg);
    return { error: msg };
  }
}

export async function createExpressDashboardLink(
  accountId: string
): Promise<{ url: string } | { error: string }> {
  if (!isStripeConfigured()) return { error: "Stripe가 설정되지 않았습니다." };

  const stripe = getStripe();
  try {
    const link = await stripe.accounts.createLoginLink(accountId);
    if (!link.url) return { error: "대시보드 링크를 만들 수 없습니다." };
    return { url: link.url };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "대시보드 링크 생성 실패";
    console.error("[settlement-express-connect] createExpressDashboardLink:", msg);
    return { error: msg };
  }
}

type StripeDobParts = { year: number | null; month: number | null; day: number | null };

function stripeDobToDate(dob: StripeDobParts | null | undefined): Date | null {
  if (dob?.year == null || dob.month == null || dob.day == null) return null;
  return new Date(dob.year, dob.month - 1, dob.day);
}

function profileNameFromStripeAccount(account: Stripe.Account): string {
  const ind = account.individual;
  if (ind?.first_name || ind?.last_name) {
    return [ind.first_name, ind.last_name].filter(Boolean).join(" ").trim();
  }
  return account.business_profile?.name?.trim() || "Stripe 온보딩";
}

/** Stripe Account → CreatorSettlementProfile 스냅샷 (Express 온보딩 후) */
export async function syncSettlementProfileFromStripeAccount(
  userId: string,
  account: Stripe.Account
) {
  const country = (account.country ?? "US").toUpperCase();
  const ind = account.individual;
  const dob = ind?.dob;
  const dobDate = stripeDobToDate(dob);
  const addr = ind?.address;

  let accountLast4 = "0000";
  let holderName = profileNameFromStripeAccount(account);
  let bankCode: string | null = null;
  let routingNumber: string | null = null;

  if (account.external_accounts?.data?.length) {
    const bank = account.external_accounts.data.find((x) => x.object === "bank_account") as
      | Stripe.BankAccount
      | undefined;
    if (bank?.last4) accountLast4 = bank.last4;
    if (bank?.account_holder_name) holderName = bank.account_holder_name;
    if (bank?.routing_number) {
      if (country === "KR") bankCode = bank.routing_number;
      else routingNumber = bank.routing_number;
    }
  }

  await db.creatorSettlementProfile.upsert({
    where: { userId },
    create: {
      userId,
      countryCode: country,
      legalName: profileNameFromStripeAccount(account),
      dateOfBirth: dobDate ?? new Date("1990-01-01"),
      addressLine1: addr?.line1 ?? "—",
      addressLine2: addr?.line2 ?? undefined,
      city: addr?.city ?? "—",
      state: addr?.state ?? undefined,
      postalCode: addr?.postal_code ?? "—",
      bankCode,
      routingNumber,
      accountNumberLast4: accountLast4,
      accountHolderName: holderName,
      stripeConnectAccountId: account.id,
      taxFormType: resolveTaxFormType(country),
      registeredAt: account.details_submitted ? new Date() : undefined,
      payoutsEnabled: !!account.payouts_enabled,
    },
    update: {
      countryCode: country,
      legalName: profileNameFromStripeAccount(account),
      ...(dobDate ? { dateOfBirth: dobDate } : {}),
      addressLine1: addr?.line1 ?? undefined,
      addressLine2: addr?.line2 ?? undefined,
      city: addr?.city ?? undefined,
      state: addr?.state ?? undefined,
      postalCode: addr?.postal_code ?? undefined,
      bankCode,
      routingNumber,
      accountNumberLast4: accountLast4,
      accountHolderName: holderName,
      stripeConnectAccountId: account.id,
      ...(account.details_submitted ? { registeredAt: new Date() } : {}),
      payoutsEnabled: !!account.payouts_enabled,
    },
  });
}

export async function syncUserExpressConnectFromStripe(userId: string, accountId: string) {
  const snap = await pullAndSyncStripeConnectAccount(accountId);
  if (!snap) return null;

  const stripe = getStripe();
  const account = await stripe.accounts.retrieve(accountId, {
    expand: ["external_accounts"],
  });
  await syncSettlementProfileFromStripeAccount(userId, account);

  if (snap.readyForPayouts) {
    await db.user.update({
      where: { id: userId },
      data: {
        stripeOnboardingCompleted: true,
        stripeConnectOnboardedAt: new Date(),
      },
    });
  }

  return snap;
}

export async function startExpressConnectOnboarding(
  userId: string,
  opts?: { requestCardPayments?: boolean }
): Promise<{ url: string; accountId: string } | { error: string }> {
  const ensured = await ensureExpressConnectAccount(userId, opts);
  if ("error" in ensured) return ensured;

  const link = await createExpressOnboardingLink(ensured.accountId);
  if ("error" in link) return link;

  return { url: link.url, accountId: ensured.accountId };
}
