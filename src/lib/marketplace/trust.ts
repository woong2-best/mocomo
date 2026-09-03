import type { MarketplaceTrustTier } from "@prisma/client";
import { db } from "@/lib/db";
import {
  MARKETPLACE_NEW_SELLER_DAYS,
  MARKETPLACE_NEW_SELLER_MAX_ORDERS,
  MARKETPLACE_SETTLEMENT_DELAY_DAYS,
  MARKETPLACE_TRUST_TIERS,
} from "@/lib/marketplace/protection-config";
import { syncSellerStripeReserve } from "@/lib/marketplace/stripe-connect-reserve";

export type TrustInputs = {
  salesCount: number;
  confirmedOrderCount: number;
  refundedOrderCount: number;
  disputedOrderCount: number;
  lateShipCount: number;
  avgShipDays: number | null;
  ratingAvg: number;
  ratingCount: number;
  reportCount: number;
  accountAgeDays: number;
  phoneVerified: boolean;
  stripeConnectReady: boolean;
};

/** 0–100 trust score from seller metrics */
export function computeTrustScore(input: TrustInputs): number {
  let score = 40;

  // Volume
  score += Math.min(15, input.salesCount * 1.2);

  // Confirm rate (vs sales)
  if (input.salesCount > 0) {
    const confirmRate = input.confirmedOrderCount / Math.max(1, input.salesCount);
    score += confirmRate * 15;
    const refundRate = input.refundedOrderCount / Math.max(1, input.salesCount);
    score -= refundRate * 25;
    const disputeRate = input.disputedOrderCount / Math.max(1, input.salesCount);
    score -= disputeRate * 30;
    const lateRate = input.lateShipCount / Math.max(1, input.salesCount);
    score -= lateRate * 15;
  }

  // Shipping speed
  if (input.avgShipDays != null) {
    if (input.avgShipDays <= 2) score += 5;
    else if (input.avgShipDays <= 5) score += 2;
    else if (input.avgShipDays > 10) score -= 8;
  }

  // Reviews
  if (input.ratingCount > 0) {
    score += (input.ratingAvg - 3) * 4;
  }

  // Reports
  score -= Math.min(20, input.reportCount * 4);

  // Account maturity & KYC
  score += Math.min(8, input.accountAgeDays / 45);
  if (input.phoneVerified) score += 5;
  if (input.stripeConnectReady) score += 8;

  return Math.max(0, Math.min(100, Math.round(score * 10) / 10));
}

export function trustTierFromScore(score: number): MarketplaceTrustTier {
  if (score >= MARKETPLACE_TRUST_TIERS.PREMIUM.min) return "PREMIUM";
  if (score >= MARKETPLACE_TRUST_TIERS.TRUSTED.min) return "TRUSTED";
  if (score >= MARKETPLACE_TRUST_TIERS.STANDARD.min) return "STANDARD";
  return "NEW";
}

export function isNewSellerProfile(profile: {
  createdAt: Date;
  confirmedOrderCount: number;
  trustTier: MarketplaceTrustTier;
}): boolean {
  if (profile.trustTier === "NEW") return true;
  const ageMs = Date.now() - profile.createdAt.getTime();
  const ageDays = ageMs / (24 * 60 * 60 * 1000);
  return (
    profile.confirmedOrderCount < MARKETPLACE_NEW_SELLER_MAX_ORDERS ||
    ageDays < MARKETPLACE_NEW_SELLER_DAYS
  );
}

/** Days to wait after confirm before releasing escrow */
export function settlementDelayDaysForSeller(profile: {
  createdAt: Date;
  confirmedOrderCount: number;
  trustTier: MarketplaceTrustTier;
}): number {
  if (isNewSellerProfile(profile)) {
    return MARKETPLACE_SETTLEMENT_DELAY_DAYS.NEW;
  }
  return MARKETPLACE_SETTLEMENT_DELAY_DAYS[profile.trustTier] ?? 3;
}

export async function refreshSellerTrust(sellerUserId: string) {
  const profile = await db.marketplaceSellerProfile.findUnique({
    where: { userId: sellerUserId },
  });
  if (!profile) return null;

  const user = await db.user.findUnique({
    where: { id: sellerUserId },
    select: {
      createdAt: true,
      phoneVerified: true,
      stripeConnectAccountId: true,
      stripeConnectOnboardedAt: true,
    },
  });
  if (!user) return null;

  const accountAgeDays =
    (Date.now() - user.createdAt.getTime()) / (24 * 60 * 60 * 1000);

  const score = computeTrustScore({
    salesCount: profile.salesCount,
    confirmedOrderCount: profile.confirmedOrderCount,
    refundedOrderCount: profile.refundedOrderCount,
    disputedOrderCount: profile.disputedOrderCount,
    lateShipCount: profile.lateShipCount,
    avgShipDays: profile.avgShipDays,
    ratingAvg: profile.ratingAvg,
    ratingCount: profile.ratingCount,
    reportCount: profile.reportCount,
    accountAgeDays,
    phoneVerified: Boolean(user.phoneVerified),
    stripeConnectReady: Boolean(
      user.stripeConnectAccountId && user.stripeConnectOnboardedAt
    ),
  });

  const trustTier = trustTierFromScore(score);

  const updated = await db.marketplaceSellerProfile.update({
    where: { id: profile.id },
    data: { trustScore: score, trustTier },
  });

  await syncSellerStripeReserve(sellerUserId).catch(() => null);

  return updated;
}
