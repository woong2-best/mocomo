import type { StripeConnectOnboardingStatus } from "@prisma/client";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { MARKET_BRAND_FULL } from "@/lib/market-brand";
import { createNotification } from "@/lib/notifications";
import { revalidatePath } from "next/cache";

export type StripeConnectSyncSnapshot = {
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  requirementsDue: boolean;
  disabledReason: string | null;
  onboardingStatus: StripeConnectOnboardingStatus;
  readyForPayouts: boolean;
};

/** Stripe Account → DB 동기화 스냅샷 (requirements 항목 내용은 저장·노출하지 않음) */
export function snapshotStripeConnectAccount(
  account: Stripe.Account
): StripeConnectSyncSnapshot {
  const currentlyDue = account.requirements?.currently_due ?? [];
  const eventuallyDue = account.requirements?.eventually_due ?? [];
  const requirementsDue = currentlyDue.length > 0 || eventuallyDue.length > 0;
  const disabledReason = account.requirements?.disabled_reason ?? null;
  const chargesEnabled = !!account.charges_enabled;
  const payoutsEnabled = !!account.payouts_enabled;

  let onboardingStatus: StripeConnectOnboardingStatus = "NOT_STARTED";
  if (disabledReason) {
    onboardingStatus = "DISABLED";
  } else if (payoutsEnabled && !requirementsDue) {
    onboardingStatus = "COMPLETE";
  } else if (requirementsDue) {
    onboardingStatus = "REQUIREMENTS_DUE";
  } else if (account.details_submitted) {
    onboardingStatus = "IN_PROGRESS";
  }

  const readyForPayouts = payoutsEnabled && !requirementsDue && !disabledReason;

  return {
    chargesEnabled,
    payoutsEnabled,
    requirementsDue,
    disabledReason,
    onboardingStatus,
    readyForPayouts,
  };
}

export async function syncStripeConnectAccountToDb(account: Stripe.Account): Promise<void> {
  const userId = account.metadata?.mocomoUserId?.trim();
  if (!userId) return;

  const snap = snapshotStripeConnectAccount(account);
  const onboardingComplete = !!account.details_submitted && !!account.payouts_enabled;
  const now = new Date();

  const currentlyDue = account.requirements?.currently_due ?? [];
  const pastDue = account.requirements?.past_due ?? [];
  const taxHints = ["tax", "ssn", "id_number", "itin", "tin", "w9", "w8"];
  const taxRequirementsDue = [...currentlyDue, ...pastDue].some((k) =>
    taxHints.some((h) => k.toLowerCase().includes(h))
  );
  const taxReportingReady =
    snap.readyForPayouts && !taxRequirementsDue && account.type === "express";

  await db.user.update({
    where: { id: userId },
    data: {
      stripeConnectAccountId: account.id,
      stripeOnboardingCompleted: onboardingComplete,
      ...(snap.readyForPayouts ? { stripeConnectOnboardedAt: now } : {}),
    },
  });

  await db.creatorSettlementProfile.updateMany({
    where: { userId },
    data: {
      stripeConnectAccountId: account.id,
      connectAccountType: account.type === "express" ? "express" : account.type ?? null,
      needsExpressMigration: account.type === "custom",
      taxReportingReady,
      taxRequirementsDue,
      lastTaxGateCheckedAt: now,
      ...(snap.readyForPayouts
        ? { payoutsEnabled: true, registeredAt: now }
        : { payoutsEnabled: !!account.payouts_enabled }),
    },
  });

  const profile = await db.marketplaceSellerProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      onboardingCompletedAt: true,
      stripeConnectStartedAt: true,
    },
  });

  if (!profile) {
    revalidatePath("/wallet");
    return;
  }

  await db.marketplaceSellerProfile.update({
    where: { id: profile.id },
    data: {
      stripeConnectChargesEnabled: snap.chargesEnabled,
      stripeConnectPayoutsEnabled: snap.payoutsEnabled,
      stripeConnectRequirementsDue: snap.requirementsDue,
      stripeConnectDisabledReason: snap.disabledReason,
      stripeConnectOnboardingStatus: snap.onboardingStatus,
      ...(!profile.stripeConnectStartedAt ? { stripeConnectStartedAt: now } : {}),
    },
  });

  if (snap.readyForPayouts && !profile.onboardingCompletedAt) {
    await db.marketplaceSellerProfile.update({
      where: { id: profile.id },
      data: {
        onboardingStep: "COMPLETE",
        onboardingCompletedAt: now,
        status: "APPROVED",
        canList: true,
        reviewedAt: now,
      },
    });

    await createNotification({
      userId,
      type: "system",
      title: "Seller registration complete",
      body: `${MARKET_BRAND_FULL} Stripe 본인 확인 및 정산 설정이 완료되었습니다. 이제 상품을 등록할 수 있습니다.`,
      link: "/market/seller",
    }).catch(() => null);
  } else if (snap.requirementsDue && profile.onboardingCompletedAt) {
    await createNotification({
      userId,
      type: "system",
      title: "Stripe — additional information required",
      body: "Submit additional information in Stripe to continue payouts.",
      link: "/market/seller",
    }).catch(() => null);
  }

  revalidatePath("/market/seller");
  revalidatePath("/market/seller/register");
  revalidatePath("/admin/market");
  revalidatePath("/wallet");
}

export function stripeConnectStatusLabel(
  status: StripeConnectOnboardingStatus,
  requirementsDue: boolean
): string {
  if (status === "COMPLETE") {
    return "Stripe identity verification and payout account registration are complete.";
  }
  if (status === "DISABLED") {
    return "Your Stripe account is paused. Check Stripe onboarding.";
  }
  if (status === "REQUIREMENTS_DUE" || requirementsDue) {
    return "Stripe requires additional information.";
  }
  if (status === "IN_PROGRESS") {
    return "Continue Stripe onboarding.";
  }
  return "Complete identity verification and register your payout account securely with Stripe.";
}
