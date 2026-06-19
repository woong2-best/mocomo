"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { isOperatorIdentity } from "@/lib/operator-config";
import { STUDIO_MIN_PAYOUT_KRW } from "@/studio/lib/constants";

export async function getStudioWalletSummary() {
  const user = await requireAuth();
  const wallet = await db.studioWallet.findUnique({ where: { userId: user.id } });
  const bank = await db.studioBankAccount.findUnique({ where: { userId: user.id } });
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
    bankAccount: bank,
  };
}

export async function saveStudioBankAccount(data: {
  bankName: string;
  accountNumber: string;
  holderName: string;
}) {
  const user = await requireAuth();
  const bankName = data.bankName.trim();
  const accountNumber = data.accountNumber.replace(/\D/g, "");
  const holderName = data.holderName.trim();
  if (!bankName || !accountNumber || !holderName) {
    return { error: "은행명·계좌번호·예금주를 모두 입력해 주세요." };
  }

  await db.studioBankAccount.upsert({
    where: { userId: user.id },
    create: { userId: user.id, bankName, accountNumber, holderName },
    update: { bankName, accountNumber, holderName },
  });

  revalidatePath("/studio/settings");
  revalidatePath("/studio/wallet");
  return { success: true };
}

export async function requestStudioPayout(amountKrw: number) {
  const user = await requireAuth();
  if (amountKrw < STUDIO_MIN_PAYOUT_KRW) {
    return { error: `최소 출금 금액은 ${STUDIO_MIN_PAYOUT_KRW.toLocaleString()}원입니다.` };
  }

  const bank = await db.studioBankAccount.findUnique({ where: { userId: user.id } });
  if (!bank) {
    return { error: "출금 전 설정에서 Studio 정산 계좌를 등록해 주세요." };
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

async function requireStudioAdmin() {
  const user = await requireAuth();
  if (!isOperatorIdentity({ username: user.username ?? "", role: user.role ?? "USER" })) {
    throw new Error("권한이 없습니다");
  }
  return user;
}

export async function getPendingStudioPayouts() {
  await requireStudioAdmin();
  return db.studioPayoutRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          name: true,
        },
      },
    },
  });
}

export async function completeStudioPayout(payoutId: string) {
  await requireStudioAdmin();

  const payout = await db.studioPayoutRequest.findUnique({ where: { id: payoutId } });
  if (!payout || payout.status !== "PENDING") return { error: "처리할 출금 요청이 없습니다." };

  await db.$transaction(async (tx) => {
    await tx.studioPayoutRequest.update({
      where: { id: payoutId },
      data: { status: "COMPLETED", processedAt: new Date() },
    });

    await tx.studioWallet.update({
      where: { userId: payout.userId },
      data: { totalWithdrawn: { increment: payout.amountKrw } },
    });

    await tx.studioWalletTransaction.create({
      data: {
        userId: payout.userId,
        type: "PAYOUT_COMPLETE",
        amount: 0,
        balanceAfter:
          (await tx.studioWallet.findUnique({ where: { userId: payout.userId } }))?.availableBalance ?? 0,
        referenceType: "StudioPayoutRequest",
        referenceId: payoutId,
        memo: `출금 완료 ${payout.amountKrw.toLocaleString()}원`,
      },
    });
  });

  revalidatePath("/studio/admin/payouts");
  revalidatePath("/studio/wallet");
  return { success: true };
}
