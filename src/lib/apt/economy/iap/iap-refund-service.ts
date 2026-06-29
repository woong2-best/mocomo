import { db } from "@/lib/db";
import { newCorrelationId } from "../audit/correlation-id";
import { writeEconomyLog } from "../economy-log-service";
import { recordHealthDomainEvent } from "../health/health-metrics";
import { notifyIapRefund, notifyIapRefundAdmin } from "../notification/economy-notify";
import { mutateWalletInTx } from "../wallet-service";
import { checkIapFraudOnRefund } from "./iap-fraud-guard";

/** 환불 시 젬 부족분을 골드로 추가 회수 (1젬 = 100골드) */
const GEM_SHORTFALL_GOLD_RATE = 100;

export async function handleIapVoidOrRefund(input: {
  orderId?: string;
  purchaseToken?: string;
  reason: string;
}): Promise<{ ok: true; purchaseId: string } | { error: string }> {
  const purchase = await db.aptIapPurchase.findFirst({
    where: {
      OR: [
        input.orderId ? { orderId: input.orderId } : {},
        input.purchaseToken ? { purchaseToken: input.purchaseToken } : {},
      ].filter((c) => Object.keys(c).length > 0),
    },
  });
  if (!purchase) return { error: "구매 기록을 찾을 수 없습니다." };
  if (purchase.status === "VOIDED" || purchase.status === "REFUNDED") {
    return { ok: true, purchaseId: purchase.id };
  }

  const corrId = purchase.correlationId ?? newCorrelationId();
  const now = new Date();
  let gemsClawed = 0;
  let goldClawed = 0;
  let goldRecoveredForGems = 0;
  let gemShortfall = 0;

  await db.$transaction(async (tx) => {
    const wallet = await tx.aptWallet.findUnique({ where: { userId: purchase.userId } });
    if (wallet) {
      gemsClawed = Math.min(wallet.gems, purchase.gemsGranted);
      if (gemsClawed > 0) {
        await mutateWalletInTx(tx, {
          userId: purchase.userId,
          currency: "gems",
          amount: -gemsClawed,
          type: "refund",
          referenceId: `${purchase.orderId}:gems`,
          referenceType: "AptIapPurchase",
          correlationId: corrId,
          memo: `IAP 환불 회수 ${purchase.productId}`,
        });
      }

      const afterGems = await tx.aptWallet.findUnique({ where: { userId: purchase.userId } });
      const goldBal = afterGems?.gold ?? 0;
      gemShortfall = Math.max(0, purchase.gemsGranted - gemsClawed);
      goldRecoveredForGems = Math.min(goldBal, gemShortfall * GEM_SHORTFALL_GOLD_RATE);
      const goldFromGrant = Math.min(goldBal - goldRecoveredForGems, purchase.goldGranted);
      goldClawed = goldRecoveredForGems + goldFromGrant;

      if (goldClawed > 0) {
        await mutateWalletInTx(tx, {
          userId: purchase.userId,
          currency: "gold",
          amount: -goldClawed,
          type: "refund",
          referenceId: `${purchase.orderId}:gold`,
          referenceType: "AptIapPurchase",
          correlationId: corrId,
          memo: `IAP 환불 회수 ${purchase.productId}`,
        });
      }
    }

    await tx.aptIapPurchase.update({
      where: { id: purchase.id },
      data: {
        status: "VOIDED",
        voidedAt: now,
        refundedAt: now,
        correlationId: corrId,
      },
    });

    await writeEconomyLog(tx, {
      userId: purchase.userId,
      action: "iap_refund",
      deltaGems: -gemsClawed,
      deltaGold: -goldClawed,
      reason: input.reason,
      referenceId: purchase.id,
      referenceType: "AptIapPurchase",
      correlationId: corrId,
    });
  });

  const remainingGemShortfall = Math.max(
    0,
    gemShortfall - Math.floor(goldRecoveredForGems / GEM_SHORTFALL_GOLD_RATE)
  );

  notifyIapRefund({
    userId: purchase.userId,
    productId: purchase.productId,
    gemsRevoked: purchase.gemsGranted,
    correlationId: corrId,
  });
  notifyIapRefundAdmin({
    orderId: purchase.orderId,
    userId: purchase.userId,
    reason: input.reason,
    correlationId: corrId,
  });

  void recordHealthDomainEvent("iap", "refund", 1);
  if (remainingGemShortfall > 0) {
    await checkIapFraudOnRefund(purchase.userId, purchase.id, remainingGemShortfall);
  }

  return { ok: true, purchaseId: purchase.id };
}
