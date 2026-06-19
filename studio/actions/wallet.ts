"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { STUDIO_MIN_PAYOUT_KRW } from "@/studio/lib/constants";

export async function getStudioWalletSummary() {
  const user = await requireAuth();
  const wallet = await db.studioWallet.findUnique({ where: { userId: user.id } });
  const pending = await db.studioPayoutRequest.findMany({
    where: { userId: user.id, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
  const transactions = await db.studioWalletTransaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return {
    availableBalance: wallet?.availableBalance ?? 0,
    totalEarned: wallet?.totalEarned ?? 0,
    totalWithdrawn: wallet?.totalWithdrawn ?? 0,
    pendingPayouts: pending,
    transactions,
  };
}

export async function requestStudioPayout(amountKrw: number) {
  const user = await requireAuth();
  if (amountKrw < STUDIO_MIN_PAYOUT_KRW) {
    return { error: `최소 출금 금액은 ${STUDIO_MIN_PAYOUT_KRW.toLocaleString()}원입니다.` };
  }

  const wallet = await db.studioWallet.findUnique({ where: { userId: user.id } });
  const available = wallet?.availableBalance ?? 0;
  if (amountKrw > available) return { error: "출금 가능 잔액이 부족합니다." };

  await db.$transaction(async (tx) => {
    const updated = await tx.studioWallet.update({
      where: { userId: user.id },
      data: { availableBalance: { decrement: amountKrw } },
    });

    await tx.studioPayoutRequest.create({
      data: { userId: user.id, amountKrw, status: "PENDING" },
    });

    await tx.studioWalletTransaction.create({
      data: {
        userId: user.id,
        type: "PAYOUT_REQUEST",
        amount: -amountKrw,
        balanceAfter: updated.availableBalance,
        memo: "출금 신청",
      },
    });
  });

  revalidatePath("/studio/wallet");
  return { success: true };
}
