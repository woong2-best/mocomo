import { db } from "@/lib/db";
import { getAppOrigin, getStripe, isStripeConfigured } from "@/lib/stripe";
import { resolveExpressPayoutCountry } from "@/lib/marketplace/stripe-supported-countries";
import { pullAndSyncStripeConnectAccount } from "@/lib/stripe-connect";
import { resolveTaxFormType } from "@/lib/settlement-moco/tax";
import { createNotification } from "@/lib/notifications";
import type Stripe from "stripe";

export {
  listExpressPayoutCountries,
  listExpressPayoutCountryCodes,
  DEFAULT_EXPRESS_PAYOUT_COUNTRY,
  resolveExpressPayoutCountry,
} from "@/lib/marketplace/stripe-supported-countries";

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
      stripeConnectAccountId: true,
    },
  });
}

/** 레거시 Custom 계정을 분리하고 Express 재온보딩 가능하게 만듦 */
async function detachLegacyCustomConnectAccount(userId: string, customAccountId: string) {
  await db.user.update({
    where: { id: userId },
    data: {
      stripeConnectAccountId: null,
      stripeOnboardingCompleted: false,
      stripeConnectOnboardedAt: null,
    },
  });

  await db.creatorSettlementProfile.upsert({
    where: { userId },
    create: {
      userId,
      countryCode: "US",
      legalName: "Express migration required",
      dateOfBirth: new Date("1990-01-01"),
      addressLine1: "—",
      city: "—",
      postalCode: "—",
      accountNumberLast4: "0000",
      accountHolderName: "—",
      taxFormType: "W9",
      connectAccountType: "custom",
      needsExpressMigration: true,
      payoutsEnabled: false,
      taxReportingReady: false,
    },
    update: {
      stripeConnectAccountId: null,
      connectAccountType: "custom",
      needsExpressMigration: true,
      payoutsEnabled: false,
      taxReportingReady: false,
      taxRequirementsDue: false,
    },
  });

  await createNotification({
    userId,
    type: "system",
    title: "Payout account reconnection required",
    body: "Stripe Express onboarding is required due to security and tax policy updates. Reconnect from your wallet.",
    link: "/wallet",
  }).catch(() => null);

  void customAccountId;
}

/** Stripe Express Connect 계정 확보 (없으면 생성). Custom 계정은 Express로 마이그레이션 안내. */
export async function ensureExpressConnectAccount(
  userId: string,
  opts?: { requestCardPayments?: boolean; payoutCountry?: string }
): Promise<{ accountId: string } | { error: string }> {
  if (!isStripeConfigured()) {
    return { error: "Stripe is not configured." };
  }

  const user = await loadUserConnectRow(userId);
  if (!user) return { error: "User not found." };

  const stripe = getStripe();

  if (user.stripeConnectAccountId) {
    try {
      const existing = await stripe.accounts.retrieve(user.stripeConnectAccountId);
      if (existing.type === "express") {
        await db.creatorSettlementProfile.updateMany({
          where: { userId },
          data: {
            connectAccountType: "express",
            needsExpressMigration: false,
            stripeConnectAccountId: existing.id,
          },
        });
        return { accountId: existing.id };
      }
      // Legacy Custom/Standard — detach and create Express
      await detachLegacyCustomConnectAccount(userId, existing.id);
    } catch {
      // stale id — fall through to create
      await db.user.update({
        where: { id: userId },
        data: { stripeConnectAccountId: null, stripeOnboardingCompleted: false },
      });
    }
  }

  const resolved = resolveExpressPayoutCountry(opts?.payoutCountry);
  if ("error" in resolved) return resolved;
  const country = resolved.country;

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
        legalName: "Stripe onboarding",
        dateOfBirth: new Date("1990-01-01"),
        addressLine1: "—",
        city: "—",
        postalCode: "—",
        accountNumberLast4: "0000",
        accountHolderName: "—",
        stripeConnectAccountId: account.id,
        taxFormType,
        connectAccountType: "express",
        needsExpressMigration: false,
        taxReportingReady: false,
      },
      update: {
        stripeConnectAccountId: account.id,
        countryCode: country,
        connectAccountType: "express",
        needsExpressMigration: false,
      },
    });

    return { accountId: account.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create Stripe Express account";
    console.error("[settlement-express-connect] ensureExpressConnectAccount:", msg);
    return { error: msg };
  }
}

export async function createExpressOnboardingLink(
  accountId: string
): Promise<{ url: string } | { error: string }> {
  if (!isStripeConfigured()) return { error: "Stripe is not configured." };

  const { refreshUrl, returnUrl } = payoutConnectUrls();
  const stripe = getStripe();

  try {
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });
    if (!link.url) return { error: "Could not create onboarding link." };
    return { url: link.url };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create onboarding link";
    console.error("[settlement-express-connect] createExpressOnboardingLink:", msg);
    return { error: msg };
  }
}

/**
 * 온보딩이 끝나기 전에는 Login Link를 만들 수 없다.
 * details_submitted가 아니면 온보딩 링크, 끝나면 Express 로그인 링크.
 */
export async function createExpressAccountLink(
  accountId: string
): Promise<{ url: string; mode: "onboarding" | "login" } | { error: string }> {
  if (!isStripeConfigured()) return { error: "Stripe is not configured." };

  const stripe = getStripe();
  try {
    const account = await stripe.accounts.retrieve(accountId);
    if (!account.details_submitted) {
      const onboarding = await createExpressOnboardingLink(accountId);
      if ("error" in onboarding) return onboarding;
      return { url: onboarding.url, mode: "onboarding" };
    }

    const link = await stripe.accounts.createLoginLink(accountId);
    if (!link.url) return { error: "Could not create dashboard link." };
    return { url: link.url, mode: "login" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create payout link";
    if (/has not completed onboarding/i.test(msg)) {
      const onboarding = await createExpressOnboardingLink(accountId);
      if ("error" in onboarding) return onboarding;
      return { url: onboarding.url, mode: "onboarding" };
    }
    console.error("[settlement-express-connect] createExpressAccountLink:", msg);
    return { error: msg };
  }
}

export async function createExpressDashboardLink(
  accountId: string
): Promise<{ url: string } | { error: string }> {
  const result = await createExpressAccountLink(accountId);
  if ("error" in result) return result;
  return { url: result.url };
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
  return account.business_profile?.name?.trim() || "Stripe onboarding";
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

  const currentlyDue = account.requirements?.currently_due ?? [];
  const pastDue = account.requirements?.past_due ?? [];
  const taxHints = ["tax", "ssn", "id_number", "itin", "tin", "w9", "w8"];
  const taxRequirementsDue = [...currentlyDue, ...pastDue].some((k) =>
    taxHints.some((h) => k.toLowerCase().includes(h))
  );
  const snapReady =
    !!account.payouts_enabled &&
    currentlyDue.length === 0 &&
    !account.requirements?.disabled_reason;

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
      connectAccountType: account.type === "express" ? "express" : account.type ?? null,
      needsExpressMigration: account.type === "custom",
      taxReportingReady: snapReady && !taxRequirementsDue && account.type === "express",
      taxRequirementsDue,
      lastTaxGateCheckedAt: new Date(),
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
      connectAccountType: account.type === "express" ? "express" : account.type ?? null,
      needsExpressMigration: account.type === "custom",
      taxReportingReady: snapReady && !taxRequirementsDue && account.type === "express",
      taxRequirementsDue,
      lastTaxGateCheckedAt: new Date(),
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
  opts?: { requestCardPayments?: boolean; payoutCountry?: string }
): Promise<{ url: string; accountId: string } | { error: string }> {
  const ensured = await ensureExpressConnectAccount(userId, opts);
  if ("error" in ensured) return ensured;

  const link = await createExpressAccountLink(ensured.accountId);
  if ("error" in link) return link;

  return { url: link.url, accountId: ensured.accountId };
}
