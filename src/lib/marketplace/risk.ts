import { db } from "@/lib/db";
import {
  MARKETPLACE_BUYER_ORDER_VELOCITY,
  MARKETPLACE_CANCEL_PATTERN_MIN,
  MARKETPLACE_CANCEL_PATTERN_WINDOW_HOURS,
  MARKETPLACE_HIGH_PRICE_THRESHOLD,
  MARKETPLACE_RISK_ADMIN_REVIEW_THRESHOLD,
} from "@/lib/marketplace/protection-config";
import { logMarketplaceAudit, MarketplaceAuditActions } from "@/lib/marketplace/audit";

export type RiskAssessment = {
  score: number;
  flags: string[];
  adminReviewRequired: boolean;
};

/** Evaluate buyer/seller/listing risk at checkout or listing publish */
export async function assessMarketplaceCheckoutRisk(input: {
  buyerId: string;
  sellerId: string;
  listingId: string;
  priceAmount: number;
  quantity: number;
}): Promise<RiskAssessment> {
  const flags: string[] = [];
  let score = 0;

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const buyerOrdersHour = await db.marketplaceOrder.count({
    where: { buyerId: input.buyerId, createdAt: { gte: hourAgo } },
  });
  if (buyerOrdersHour >= MARKETPLACE_BUYER_ORDER_VELOCITY) {
    flags.push("BUYER_VELOCITY");
    score += 35;
  }

  const cancelWindow = new Date(
    Date.now() - MARKETPLACE_CANCEL_PATTERN_WINDOW_HOURS * 60 * 60 * 1000
  );
  const cancels = await db.marketplaceOrder.count({
    where: {
      buyerId: input.buyerId,
      status: { in: ["CANCELLED", "REFUNDED"] },
      createdAt: { gte: cancelWindow },
    },
  });
  if (cancels >= MARKETPLACE_CANCEL_PATTERN_MIN) {
    flags.push("CANCEL_PATTERN");
    score += 30;
  }

  const unitTotal = input.priceAmount * input.quantity;
  if (unitTotal >= MARKETPLACE_HIGH_PRICE_THRESHOLD) {
    flags.push("HIGH_VALUE");
    score += 20;
  }

  const sellerProfile = await db.marketplaceSellerProfile.findUnique({
    where: { userId: input.sellerId },
    select: {
      reportCount: true,
      disputedOrderCount: true,
      sanctionLevel: true,
      salesCount: true,
      createdAt: true,
    },
  });

  if (sellerProfile) {
    if (sellerProfile.reportCount >= 3) {
      flags.push("SELLER_REPORTS");
      score += 25;
    }
    if (sellerProfile.disputedOrderCount >= 3) {
      flags.push("SELLER_DISPUTES");
      score += 20;
    }
    if (
      sellerProfile.sanctionLevel === "SETTLEMENT_HELD" ||
      sellerProfile.sanctionLevel === "SALES_SUSPENDED" ||
      sellerProfile.sanctionLevel === "PERMANENT_BAN"
    ) {
      flags.push("SELLER_SANCTIONED");
      score += 50;
    }

    // Sudden sales spike vs young account
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const daySales = await db.marketplaceOrder.count({
      where: {
        sellerId: input.sellerId,
        createdAt: { gte: dayAgo },
        status: { notIn: ["AWAITING_PAYMENT", "CANCELLED"] },
      },
    });
    const accountDays =
      (Date.now() - sellerProfile.createdAt.getTime()) / (24 * 60 * 60 * 1000);
    if (daySales >= 8 && accountDays < 14) {
      flags.push("SUDDEN_VOLUME");
      score += 25;
    }
  }

  score = Math.min(100, score);
  return {
    score,
    flags,
    adminReviewRequired: score >= MARKETPLACE_RISK_ADMIN_REVIEW_THRESHOLD,
  };
}

export async function assessListingPublishRisk(input: {
  sellerId: string;
  priceAmount: number;
}): Promise<RiskAssessment> {
  const flags: string[] = [];
  let score = 0;

  if (input.priceAmount >= MARKETPLACE_HIGH_PRICE_THRESHOLD) {
    flags.push("HIGH_PRICE_LISTING");
    score += 25;
  }

  const profile = await db.marketplaceSellerProfile.findUnique({
    where: { userId: input.sellerId },
    select: { reportCount: true, sanctionLevel: true, salesCount: true },
  });
  if (profile?.reportCount && profile.reportCount >= 5) {
    flags.push("HEAVY_REPORTS");
    score += 30;
  }
  if (profile?.sanctionLevel === "LISTING_RESTRICTED") {
    flags.push("LISTING_RESTRICTED");
    score += 40;
  }

  score = Math.min(100, score);
  return {
    score,
    flags,
    adminReviewRequired: score >= MARKETPLACE_RISK_ADMIN_REVIEW_THRESHOLD,
  };
}

export async function applyOrderRiskFlags(
  orderId: string,
  risk: RiskAssessment,
  actorId?: string
) {
  if (risk.flags.length === 0 && risk.score === 0) return;

  // Do not change order status here — payment still pending.
  // fulfillMarketplaceOrder will promote to ADMIN_REVIEW after pay if needed.
  await db.marketplaceOrder.update({
    where: { id: orderId },
    data: {
      riskScore: risk.score,
      riskFlags: risk.flags,
      adminReviewRequired: risk.adminReviewRequired,
    },
  });

  await logMarketplaceAudit({
    orderId,
    actorId,
    action: MarketplaceAuditActions.RISK_FLAG,
    detail: `score=${risk.score} flags=${risk.flags.join(",")}`,
    metadata: { ...risk },
  });
}
