import { db } from "@/lib/db";
import { notifyFraudWatch } from "../notification/economy-notify";

export async function checkIapFraudBeforeFulfill(
  userId: string,
  purchaseToken: string
): Promise<{ ok: true } | { error: string }> {
  const existing = await db.aptIapPurchase.findUnique({
    where: { purchaseToken },
    select: { userId: true },
  });
  if (existing && existing.userId !== userId) {
    void recordIapFraudEvent("TOKEN_REUSE", userId, existing.userId);
    return { error: "이미 사용된 결제 토큰입니다." };
  }
  return { ok: true };
}

export async function checkIapFraudOnRefund(
  userId: string,
  purchaseId: string,
  shortfallGems: number
): Promise<void> {
  if (shortfallGems <= 0) return;
  void recordIapFraudEvent("REFUND_ABUSE", userId, purchaseId, { shortfallGems });
  notifyFraudWatch(userId);
}

async function recordIapFraudEvent(
  rule: string,
  userId: string,
  referenceId: string,
  evidence?: Record<string, unknown>
): Promise<void> {
  await db.aptFraudScoreHistory.create({
    data: {
      userId,
      score: rule === "TOKEN_REUSE" ? 80 : 70,
      status: "SUSPICIOUS",
      triggers: { rule, referenceId, ...evidence },
    },
  });
}
