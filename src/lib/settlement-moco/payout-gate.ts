import type Stripe from "stripe";
import { db } from "@/lib/db";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { snapshotStripeConnectAccount } from "@/lib/marketplace/stripe-connect-sync";
import { resolveTaxFormType } from "@/lib/settlement-moco/tax";
import { REWARD_BATCH_STATUS, type RewardBatchStatus } from "@/lib/settlement-moco/payout-status";

const TAX_REQUIREMENT_HINTS = [
  "tax",
  "ssn",
  "id_number",
  "itin",
  "tin",
  "w9",
  "w8",
  "individual.id_number",
  "individual.ssn",
  "company.tax_id",
];

export type PayoutGateResult = {
  ok: boolean;
  accountId: string | null;
  accountType: "express" | "custom" | "standard" | "none" | "unknown";
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  taxReportingReady: boolean;
  taxRequirementsDue: boolean;
  needsExpressMigration: boolean;
  skipStatus: RewardBatchStatus | null;
  skipReason: string | null;
};

function isTaxRequirement(key: string): boolean {
  const lower = key.toLowerCase();
  return TAX_REQUIREMENT_HINTS.some((h) => lower.includes(h));
}

function hasTaxRequirementsDue(account: Stripe.Account): boolean {
  const due = [
    ...(account.requirements?.currently_due ?? []),
    ...(account.requirements?.past_due ?? []),
  ];
  return due.some(isTaxRequirement);
}

export function evaluateStripeAccountForRewardPayout(
  account: Stripe.Account | null
): PayoutGateResult {
  if (!account) {
    return {
      ok: false,
      accountId: null,
      accountType: "none",
      payoutsEnabled: false,
      detailsSubmitted: false,
      taxReportingReady: false,
      taxRequirementsDue: false,
      needsExpressMigration: false,
      skipStatus: REWARD_BATCH_STATUS.SKIPPED_UNONBOARDED,
      skipReason: "No Stripe Connect account. Complete Express onboarding.",
    };
  }

  const accountType =
    account.type === "express" || account.type === "custom" || account.type === "standard"
      ? account.type
      : "unknown";

  if (account.type === "custom") {
    return {
      ok: false,
      accountId: account.id,
      accountType: "custom",
      payoutsEnabled: !!account.payouts_enabled,
      detailsSubmitted: !!account.details_submitted,
      taxReportingReady: false,
      taxRequirementsDue: hasTaxRequirementsDue(account),
      needsExpressMigration: true,
      skipStatus: REWARD_BATCH_STATUS.SKIPPED_UNONBOARDED,
      skipReason:
        "Legacy Custom account. Reconnect with Stripe Express onboarding.",
    };
  }

  const snap = snapshotStripeConnectAccount(account);
  const taxRequirementsDue = hasTaxRequirementsDue(account);
  const taxReportingReady =
    snap.readyForPayouts && !taxRequirementsDue && account.type === "express";

  if (!account.payouts_enabled || !account.details_submitted) {
    return {
      ok: false,
      accountId: account.id,
      accountType,
      payoutsEnabled: !!account.payouts_enabled,
      detailsSubmitted: !!account.details_submitted,
      taxReportingReady: false,
      taxRequirementsDue,
      needsExpressMigration: false,
      skipStatus: REWARD_BATCH_STATUS.SKIPPED_UNONBOARDED,
      skipReason: "Stripe Express onboarding is not complete.",
    };
  }

  if (taxRequirementsDue) {
    return {
      ok: false,
      accountId: account.id,
      accountType,
      payoutsEnabled: true,
      detailsSubmitted: true,
      taxReportingReady: false,
      taxRequirementsDue: true,
      needsExpressMigration: false,
      skipStatus: REWARD_BATCH_STATUS.SKIPPED_TAX_INCOMPLETE,
      skipReason:
        "Tax information (W-9/W-8BEN, etc.) is incomplete. Complete tax info in Stripe Express.",
    };
  }

  if (!snap.readyForPayouts) {
    return {
      ok: false,
      accountId: account.id,
      accountType,
      payoutsEnabled: snap.payoutsEnabled,
      detailsSubmitted: !!account.details_submitted,
      taxReportingReady: false,
      taxRequirementsDue: false,
      needsExpressMigration: false,
      skipStatus: REWARD_BATCH_STATUS.SKIPPED_UNONBOARDED,
      skipReason: "Stripe requires additional information.",
    };
  }

  return {
    ok: true,
    accountId: account.id,
    accountType,
    payoutsEnabled: true,
    detailsSubmitted: true,
    taxReportingReady,
    taxRequirementsDue: false,
    needsExpressMigration: false,
    skipStatus: null,
    skipReason: null,
  };
}

/** Stripe 계정 조회 + CreatorSettlementProfile 세무 게이트 필드 동기화 */
export async function checkCreatorRewardPayoutGate(userId: string): Promise<PayoutGateResult> {
  if (!isStripeConfigured()) {
    return {
      ok: false,
      accountId: null,
      accountType: "none",
      payoutsEnabled: false,
      detailsSubmitted: false,
      taxReportingReady: false,
      taxRequirementsDue: false,
      needsExpressMigration: false,
      skipStatus: REWARD_BATCH_STATUS.SKIPPED_UNONBOARDED,
      skipReason: "Stripe is not configured.",
    };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      stripeConnectAccountId: true,
      stripeOnboardingCompleted: true,
      countryCode: true,
      creatorSettlementProfile: {
        select: {
          countryCode: true,
          needsExpressMigration: true,
          connectAccountType: true,
        },
      },
    },
  });

  if (!user?.stripeConnectAccountId) {
    const gate = evaluateStripeAccountForRewardPayout(null);
    await persistTaxGateSnapshot(userId, gate, user?.countryCode ?? "US");
    return gate;
  }

  if (user.creatorSettlementProfile?.needsExpressMigration) {
    const gate: PayoutGateResult = {
      ok: false,
      accountId: user.stripeConnectAccountId,
      accountType: "custom",
      payoutsEnabled: false,
      detailsSubmitted: false,
      taxReportingReady: false,
      taxRequirementsDue: false,
      needsExpressMigration: true,
      skipStatus: REWARD_BATCH_STATUS.SKIPPED_UNONBOARDED,
      skipReason:
        "Legacy Custom account. Reconnect with Stripe Express onboarding.",
    };
    await persistTaxGateSnapshot(userId, gate, user.countryCode ?? "US");
    return gate;
  }

  try {
    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);
    const gate = evaluateStripeAccountForRewardPayout(account);
    const country =
      user.creatorSettlementProfile?.countryCode ??
      account.country ??
      user.countryCode ??
      "US";
    await persistTaxGateSnapshot(userId, gate, country);
    return gate;
  } catch {
    const gate: PayoutGateResult = {
      ok: false,
      accountId: user.stripeConnectAccountId,
      accountType: "unknown",
      payoutsEnabled: false,
      detailsSubmitted: false,
      taxReportingReady: false,
      taxRequirementsDue: false,
      needsExpressMigration: false,
      skipStatus: REWARD_BATCH_STATUS.SKIPPED_UNONBOARDED,
      skipReason: "Could not verify Stripe account status.",
    };
    await persistTaxGateSnapshot(userId, gate, user.countryCode ?? "US");
    return gate;
  }
}

export type CreatorPayoutDashboard = {
  /** Stripe Account.payouts_enabled — donation eligibility */
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  readyForDonations: boolean;
  disabledReason: string | null;
  currentlyDue: string[];
  pastDue: string[];
  /** Creator-only. Donors never receive these strings. */
  reasons: { code: string; message: string }[];
};

/** Authenticated creator settlement dashboard — live Stripe requirements, not the donor error. */
export async function getCreatorPayoutDashboard(userId: string): Promise<CreatorPayoutDashboard> {
  const [profile, user] = await Promise.all([
    db.creatorSettlementProfile.findUnique({
      where: { userId },
      select: {
        payoutsEnabled: true,
        needsExpressMigration: true,
        stripeConnectAccountId: true,
      },
    }),
    db.user.findUnique({
      where: { id: userId },
      select: { stripeConnectAccountId: true },
    }),
  ]);
  const accountId = user?.stripeConnectAccountId ?? profile?.stripeConnectAccountId ?? null;

  if (!accountId || !isStripeConfigured()) {
    return {
      payoutsEnabled: false,
      detailsSubmitted: false,
      readyForDonations: false,
      disabledReason: null,
      currentlyDue: [],
      pastDue: [],
      reasons: [
        {
          code: "NO_CONNECT_ACCOUNT",
          message: "No Stripe Connect account. Start payout account linking.",
        },
      ],
    };
  }

  try {
    const account = await getStripe().accounts.retrieve(accountId);
    const currentlyDue = [...(account.requirements?.currently_due ?? [])];
    const pastDue = [...(account.requirements?.past_due ?? [])];
    const disabledReason = account.requirements?.disabled_reason ?? null;
    const reasons: { code: string; message: string }[] = [];

    if (account.type === "custom" || profile?.needsExpressMigration) {
      reasons.push({
        code: "EXPRESS_MIGRATION",
        message: "Previous Custom account. Reconnect with Stripe Express.",
      });
    }
    if (!account.details_submitted) {
      reasons.push({
        code: "DETAILS_NOT_SUBMITTED",
        message: "Identity verification, bank account, and tax information submission are incomplete.",
      });
    }
    if (!account.payouts_enabled) {
      reasons.push({
        code: "PAYOUTS_DISABLED",
        message: "Stripe has not enabled payouts yet (payouts_enabled).",
      });
    }
    if (disabledReason) {
      reasons.push({
        code: "ACCOUNT_DISABLED",
        message: `Stripe account restriction: {v0} ${disabledReason}`,
      });
    }
    if (pastDue.length > 0) {
      reasons.push({
        code: "PAST_DUE",
        message: `Overdue submission items: {v0} ${pastDue.join(", ")}`,
      });
    }
    if (currentlyDue.length > 0) {
      reasons.push({
        code: "CURRENTLY_DUE",
        message: `Additional submission required: {v0} ${currentlyDue.join(", ")}`,
      });
    }

    return {
      payoutsEnabled: !!account.payouts_enabled,
      detailsSubmitted: !!account.details_submitted,
      readyForDonations: !!account.payouts_enabled,
      disabledReason,
      currentlyDue,
      pastDue,
      reasons,
    };
  } catch {
    const enabled = !!profile?.payoutsEnabled;
    return {
      payoutsEnabled: enabled,
      detailsSubmitted: false,
      readyForDonations: enabled,
      disabledReason: null,
      currentlyDue: [],
      pastDue: [],
      reasons: enabled
        ? []
        : [
            {
              code: "STRIPE_STATUS_UNAVAILABLE",
              message: "Could not verify Stripe account status. Open again in a moment.",
            },
          ],
    };
  }
}

async function persistTaxGateSnapshot(
  userId: string,
  gate: PayoutGateResult,
  countryCode: string
) {
  const now = new Date();
  const taxFormType = resolveTaxFormType(countryCode);
  await db.creatorSettlementProfile.upsert({
    where: { userId },
    create: {
      userId,
      countryCode: countryCode.toUpperCase(),
      legalName: "Stripe onboarding",
      dateOfBirth: new Date("1990-01-01"),
      addressLine1: "—",
      city: "—",
      postalCode: "—",
      accountNumberLast4: "0000",
      accountHolderName: "—",
      stripeConnectAccountId: gate.accountId,
      taxFormType,
      connectAccountType: gate.accountType === "none" ? null : gate.accountType,
      taxReportingReady: gate.taxReportingReady,
      taxRequirementsDue: gate.taxRequirementsDue,
      needsExpressMigration: gate.needsExpressMigration,
      payoutsEnabled: gate.ok,
      lastTaxGateCheckedAt: now,
    },
    update: {
      ...(gate.accountId ? { stripeConnectAccountId: gate.accountId } : {}),
      connectAccountType: gate.accountType === "none" ? null : gate.accountType,
      taxReportingReady: gate.taxReportingReady,
      taxRequirementsDue: gate.taxRequirementsDue,
      needsExpressMigration: gate.needsExpressMigration,
      payoutsEnabled: gate.ok,
      lastTaxGateCheckedAt: now,
    },
  });
}
