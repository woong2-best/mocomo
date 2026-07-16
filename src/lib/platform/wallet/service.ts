import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type WalletBucket =
  | "MOCO_POINTS"
  | "SITE_CREDIT"
  | "PROMO_CREDIT"
  | "REFUND_CREDIT";

export async function getOrCreatePlatformWallet(userId: string) {
  const existing = await db.platformWallet.findUnique({ where: { userId } });
  if (existing) return existing;
  return db.platformWallet.create({
    data: { userId },
  });
}

/** 향후 포인트/크레딧 변동 — 현재는 준비용 API */
export async function creditPlatformWallet(input: {
  userId: string;
  bucket: WalletBucket;
  amount: number;
  reason: string;
  referenceType?: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}) {
  if (input.amount === 0) return null;
  const wallet = await getOrCreatePlatformWallet(input.userId);
  const field =
    input.bucket === "MOCO_POINTS"
      ? "mocoPoints"
      : input.bucket === "SITE_CREDIT"
        ? "siteCreditKrw"
        : input.bucket === "PROMO_CREDIT"
          ? "promoCreditKrw"
          : "refundCreditKrw";

  return db.$transaction(async (tx) => {
    const updated = await tx.platformWallet.update({
      where: { id: wallet.id },
      data: { [field]: { increment: input.amount } },
    });
    const balanceAfter = updated[field] as number;
    await tx.platformWalletLedger.create({
      data: {
        walletId: wallet.id,
        bucket: input.bucket,
        delta: input.amount,
        balanceAfter,
        reason: input.reason,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });
    return updated;
  });
}
