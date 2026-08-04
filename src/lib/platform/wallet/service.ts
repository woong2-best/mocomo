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

function bucketField(bucket: WalletBucket) {
  return bucket === "MOCO_POINTS"
    ? "mocoPoints"
    : bucket === "SITE_CREDIT"
      ? "siteCreditKrw"
      : bucket === "PROMO_CREDIT"
        ? "promoCreditKrw"
        : "refundCreditKrw";
}

/** 포인트/크레딧 증가. 멱등: 동일 referenceType+referenceId 재호출 시 스킵 */
export async function creditPlatformWallet(input: {
  userId: string;
  bucket: WalletBucket;
  amount: number;
  reason: string;
  referenceType?: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}) {
  if (input.amount <= 0) return null;
  const wallet = await getOrCreatePlatformWallet(input.userId);
  const field = bucketField(input.bucket);

  return db.$transaction(async (tx) => {
    if (input.referenceType && input.referenceId) {
      const existing = await tx.platformWalletLedger.findFirst({
        where: {
          walletId: wallet.id,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          delta: { gt: 0 },
        },
      });
      if (existing) {
        return tx.platformWallet.findUniqueOrThrow({ where: { id: wallet.id } });
      }
    }

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

/** 원자적 차감. 잔액 부족 시 error */
export async function debitPlatformWallet(input: {
  userId: string;
  bucket: WalletBucket;
  amount: number;
  reason: string;
  referenceType?: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (input.amount <= 0) return { ok: false, error: "차감 금액이 올바르지 않습니다." };
  const wallet = await getOrCreatePlatformWallet(input.userId);
  const field = bucketField(input.bucket);

  try {
    await db.$transaction(async (tx) => {
      if (input.referenceType && input.referenceId) {
        const existing = await tx.platformWalletLedger.findFirst({
          where: {
            walletId: wallet.id,
            referenceType: input.referenceType,
            referenceId: input.referenceId,
            delta: { lt: 0 },
          },
        });
        if (existing) return;
      }

      const current = await tx.platformWallet.findUniqueOrThrow({
        where: { id: wallet.id },
      });
      const bal = current[field] as number;
      if (bal < input.amount) {
        throw new Error("INSUFFICIENT");
      }
      const updated = await tx.platformWallet.update({
        where: { id: wallet.id },
        data: { [field]: { decrement: input.amount } },
      });
      await tx.platformWalletLedger.create({
        data: {
          walletId: wallet.id,
          bucket: input.bucket,
          delta: -input.amount,
          balanceAfter: updated[field] as number,
          reason: input.reason,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          metadata: input.metadata as Prisma.InputJsonValue | undefined,
        },
      });
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof Error && e.message === "INSUFFICIENT") {
      return { ok: false, error: "모코 잔액이 부족합니다." };
    }
    throw e;
  }
}
