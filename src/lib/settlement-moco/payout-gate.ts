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
      skipReason: "Stripe Connect 계정이 없습니다. Express 온보딩을 완료해 주세요.",
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
        "레거시 Custom 계정입니다. Stripe Express 온보딩으로 재연동해 주세요.",
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
      skipReason: "Stripe Express 온보딩이 완료되지 않았습니다.",
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
        "세무 정보(W-9/W-8BEN 등)가 미비합니다. Stripe Express에서 세무 정보를 완료해 주세요.",
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
      skipReason: "Stripe 추가 정보 제출이 필요합니다.",
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
      skipReason: "Stripe가 설정되지 않았습니다.",
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
        "레거시 Custom 계정입니다. Stripe Express 온보딩으로 재연동해 주세요.",
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
      skipReason: "Stripe 계정 상태를 확인할 수 없습니다.",
    };
    await persistTaxGateSnapshot(userId, gate, user.countryCode ?? "US");
    return gate;
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
      legalName: "Stripe 온보딩",
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
