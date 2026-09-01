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
  const now = new Date();

  const profile = await db.marketplaceSellerProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      onboardingCompletedAt: true,
      stripeConnectStartedAt: true,
    },
  });

  if (!profile) return;

  await db.user.update({
    where: { id: userId },
    data: {
      stripeConnectAccountId: account.id,
      ...(snap.readyForPayouts ? { stripeConnectOnboardedAt: now } : {}),
    },
  });

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
      title: "판매자 등록 완료",
      body: `${MARKET_BRAND_FULL} Stripe 본인 확인 및 정산 설정이 완료되었습니다. 이제 상품을 등록할 수 있습니다.`,
      link: "/market/seller",
    }).catch(() => null);
  } else if (snap.requirementsDue && profile.onboardingCompletedAt) {
    await createNotification({
      userId,
      type: "system",
      title: "Stripe 추가 정보 필요",
      body: "정산을 계속하려면 Stripe에서 추가 정보를 제출해 주세요.",
      link: "/market/seller",
    }).catch(() => null);
  }

  revalidatePath("/market/seller");
  revalidatePath("/market/seller/register");
  revalidatePath("/admin/market");
}

export function stripeConnectStatusLabel(
  status: StripeConnectOnboardingStatus,
  requirementsDue: boolean
): string {
  if (status === "COMPLETE") {
    return "Stripe 본인 확인 및 정산 계좌 등록이 완료되었습니다.";
  }
  if (status === "DISABLED") {
    return "Stripe 계정이 일시 중지되었습니다. Stripe 온보딩에서 확인해 주세요.";
  }
  if (status === "REQUIREMENTS_DUE" || requirementsDue) {
    return "Stripe에서 추가 정보 제출이 필요합니다.";
  }
  if (status === "IN_PROGRESS") {
    return "Stripe 온보딩을 이어서 진행해 주세요.";
  }
  return "Stripe로 안전하게 본인 확인 및 정산 계좌를 등록해 주세요.";
}
