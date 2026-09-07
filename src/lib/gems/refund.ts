import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import {
  REFUND_PROCESSING_FEE_RATE,
  REFUND_WINDOW_DAYS_GLOBAL,
  REFUND_WINDOW_DAYS_KR,
  usdToStripeCents,
} from "@/lib/gems/constants";
import { syncUserGemBalance } from "@/lib/gems/balance";

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export async function processRefundRequest(gemPurchaseId: string, requestedBy: string) {
  const purchase = await db.gemPurchase.findUnique({ where: { id: gemPurchaseId } });
  const user = await db.user.findUnique({
    where: { id: requestedBy },
    select: { countryCode: true },
  });

  if (!purchase || purchase.fanId !== requestedBy) {
    return { error: "UNAUTHORIZED" as const };
  }
  if (purchase.refunded) {
    return { error: "ALREADY_REFUNDED" as const };
  }
  if (purchase.remainingGems <= 0) {
    return { error: "NO_REMAINING_GEMS_TO_REFUND" as const };
  }

  const daysSincePurchase = daysBetween(purchase.createdAt, new Date());
  const isKoreanConsumer = user?.countryCode === "KR";
  const maxDays = isKoreanConsumer ? REFUND_WINDOW_DAYS_KR : REFUND_WINDOW_DAYS_GLOBAL;

  if (daysSincePurchase > maxDays) {
    return { error: "REFUND_WINDOW_EXPIRED" as const };
  }

  const grossUnusedUsd = purchase.remainingGems * purchase.pricePerGemUsd;
  const processingFeeUsd = grossUnusedUsd * REFUND_PROCESSING_FEE_RATE;
  const finalRefundUsd = Math.max(0, grossUnusedUsd - processingFeeUsd);

  const stripe = getStripe();
  await stripe.refunds.create({
    payment_intent: purchase.stripePaymentIntentId,
    amount: usdToStripeCents(finalRefundUsd),
  });

  await db.gemPurchase.update({
    where: { id: purchase.id },
    data: {
      refunded: true,
      refundedUsd: finalRefundUsd,
      remainingGems: 0,
    },
  });

  await syncUserGemBalance(purchase.fanId);

  return {
    status: "refunded" as const,
    refundedUsd: finalRefundUsd,
    feeDeductedUsd: processingFeeUsd,
  };
}

export async function submitUnauthorizedPaymentClaim(input: {
  gemPurchaseId: string;
  fanId: string;
  reason: "stolen_card" | "minor_without_consent";
  proofUrl?: string;
}) {
  const purchase = await db.gemPurchase.findUnique({
    where: { id: input.gemPurchaseId },
  });
  if (!purchase || purchase.fanId !== input.fanId) {
    return { error: "UNAUTHORIZED" as const };
  }

  const claim = await db.unauthorizedPaymentClaim.create({
    data: {
      gemPurchaseId: input.gemPurchaseId,
      fanId: input.fanId,
      reason: input.reason,
      status: "submitted",
      proofUrl: input.proofUrl ?? null,
    },
  });

  return { success: true as const, claim };
}
