import { db } from "@/lib/db";
import { newCorrelationId } from "../audit/correlation-id";
import { writeEconomyLog } from "../economy-log-service";
import { recordHealthDomainEvent } from "../health/health-metrics";
import { notifyIapRefund, notifyIapRefundAdmin } from "../notification/economy-notify";
import { mutateWalletInTx } from "../wallet-service";
import { checkIapFraudOnRefund } from "./iap-fraud-guard";

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

  await db.$transaction(async (tx) => {
    let gemsClawed = 0;
    let goldClawed = 0;
    const wallet = await tx.aptWallet.findUnique({ where: { userId: purchase.userId } });
    if (wallet) {
      gemsClawed = Math.min(wallet.gems, purchase.gemsGranted);
      goldClawed = Math.min(wallet.gold, purchase.goldGranted);
      if (gemsClawed > 0) {
        await mutateWalletInTx(tx, {
          userId: purchase.userId,
          currency: "gems",
          amount: -gemsClawed,
          type: "refund",
          referenceId: purchase.orderId,
          referenceType: "AptIapPurchase",
          correlationId: corrId,
          memo: `IAP 환불 회수 ${purchase.productId}`,
        });
      }
      if (goldClawed > 0) {
        await mutateWalletInTx(tx, {
          userId: purchase.userId,
          currency: "gold",
          amount: -goldClawed,
          type: "refund",
          referenceId: purchase.orderId,
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

  const shortfall = Math.max(
    0,
    purchase.gemsGranted -
      ((
        await db.aptWallet.findUnique({
          where: { userId: purchase.userId },
          select: { gems: true },
        })
      )?.gems ?? 0)
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
  if (shortfall > 0) {
    await checkIapFraudOnRefund(purchase.userId, purchase.id, shortfall);
  }

  return { ok: true, purchaseId: purchase.id };
}
