/**
 * Stripe Connect seller rolling reserve — payout delay + policy bps on profile.
 * Post-capture chargeback exposure stays on the connected account (Stripe-side reserve).
 */

import type { MarketplaceSanctionLevel, MarketplaceTrustTier } from "@prisma/client";
import { db } from "@/lib/db";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { safeLogInfo, safeLogWarn } from "@/lib/safe-log";
import { logMarketplaceAudit, MarketplaceAuditActions } from "@/lib/marketplace/audit";
import {
  MARKETPLACE_ROLLING_RESERVE_BPS,
  MARKETPLACE_ROLLING_RESERVE_PAYOUT_DAYS,
} from "@/lib/marketplace/protection-config";

export type RollingReservePolicy = {
  reserveBps: number;
  payoutDelayDays: number;
};

export function computeRollingReservePolicy(profile: {
  trustTier: MarketplaceTrustTier;
  disputedOrderCount: number;
  refundedOrderCount: number;
  confirmedOrderCount: number;
  sanctionLevel: MarketplaceSanctionLevel;
  settlementBlocked: boolean;
}): RollingReservePolicy {
  let reserveBps = MARKETPLACE_ROLLING_RESERVE_BPS[profile.trustTier] ?? 1000;
  let payoutDelayDays =
    MARKETPLACE_ROLLING_RESERVE_PAYOUT_DAYS[profile.trustTier] ?? 7;

  const sales = Math.max(1, profile.confirmedOrderCount);
  const disputeRate = profile.disputedOrderCount / sales;
  const refundRate = profile.refundedOrderCount / sales;

  if (disputeRate >= 0.05) reserveBps += 500;
  if (refundRate >= 0.1) reserveBps += 500;

  if (profile.settlementBlocked || profile.sanctionLevel === "SETTLEMENT_HELD") {
    reserveBps = Math.max(reserveBps, 2500);
    payoutDelayDays = Math.max(payoutDelayDays, 14);
  }
  if (profile.sanctionLevel === "PERMANENT_BAN") {
    reserveBps = 5000;
    payoutDelayDays = 30;
  }

  return {
    reserveBps: Math.min(5000, reserveBps),
    payoutDelayDays: Math.min(30, payoutDelayDays),
  };
}

/** Push rolling reserve policy to Stripe Connect + mirror on seller profile. */
export async function syncSellerStripeReserve(
  sellerUserId: string
): Promise<{ ok: true; policy: RollingReservePolicy } | { error: string } | null> {
  const profile = await db.marketplaceSellerProfile.findUnique({
    where: { userId: sellerUserId },
  });
  if (!profile) return null;

  const policy = computeRollingReservePolicy(profile);

  await db.marketplaceSellerProfile.update({
    where: { id: profile.id },
    data: {
      stripeRollingReserveBps: policy.reserveBps,
      stripePayoutDelayDays: policy.payoutDelayDays,
      stripeReserveSyncedAt: new Date(),
    },
  });

  if (!isStripeConfigured()) {
    return { ok: true, policy };
  }

  const user = await db.user.findUnique({
    where: { id: sellerUserId },
    select: { stripeConnectAccountId: true },
  });
  const accountId = user?.stripeConnectAccountId?.trim();
  if (!accountId) {
    return { ok: true, policy };
  }

  try {
    const stripe = getStripe();
    await stripe.accounts.update(accountId, {
      settings: {
        payouts: {
          schedule: {
            delay_days: policy.payoutDelayDays,
          },
        },
      },
      metadata: {
        mocomoReserveBps: String(policy.reserveBps),
        mocomoTrustTier: profile.trustTier,
      },
    });
    safeLogInfo("stripe-connect-reserve", {
      sellerUserId,
      reserveBps: policy.reserveBps,
      payoutDelayDays: policy.payoutDelayDays,
    });
  } catch (e) {
    safeLogWarn("stripe-connect-reserve", {
      sellerUserId,
      error: e instanceof Error ? e.message : "sync failed",
    });
    return { error: e instanceof Error ? e.message : "Stripe reserve sync failed" };
  }

  return { ok: true, policy };
}

export async function syncRollingReserveBatch(limit = 50): Promise<{
  synced: number;
  skipped: number;
}> {
  const profiles = await db.marketplaceSellerProfile.findMany({
    where: {
      user: { stripeConnectAccountId: { not: null } },
    },
    orderBy: { updatedAt: "asc" },
    take: limit,
    select: { userId: true },
  });

  let synced = 0;
  let skipped = 0;
  for (const row of profiles) {
    const res = await syncSellerStripeReserve(row.userId);
    if (res && "ok" in res && res.ok) synced += 1;
    else skipped += 1;
  }

  if (synced > 0) {
    await logMarketplaceAudit({
      action: MarketplaceAuditActions.RESERVE_SYNC,
      detail: `batch:${synced}`,
      metadata: { synced, skipped },
    });
  }

  return { synced, skipped };
}
