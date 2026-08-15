"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getWalletSummary, MIN_PAYOUT_KRW } from "@/lib/settlement";
import { getWalletEarningsAnalytics } from "@/lib/wallet-analytics";

export async function getMyWallet() {
  const user = await requireAuth();
  return getWalletSummary(user.id);
}

export async function getMyWalletEarnings(year?: number) {
  const user = await requireAuth();
  return getWalletEarningsAnalytics(user.id, year);
}

export async function saveBankAccount(data: {
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

  try {
    await db.bankAccount.upsert({
      where: { userId: user.id },
      create: { userId: user.id, bankName, accountNumber, holderName },
      update: { bankName, accountNumber, holderName },
    });
    revalidatePath("/wallet");
    revalidatePath("/support");
    return { success: true };
  } catch {
    return { error: "계좌 저장에 실패했습니다. DB 섹션 L을 실행해 주세요." };
  }
}

export async function requestPayout(amount: number) {
  const user = await requireAuth();
  if (amount < MIN_PAYOUT_KRW) {
    return { error: `최소 출금 금액은 ${MIN_PAYOUT_KRW.toLocaleString()}원입니다.` };
  }

  try {
    const bank = await db.bankAccount.findUnique({ where: { userId: user.id } });
    const verified = await db.user.findUnique({
      where: { id: user.id },
      select: {
        bankVerifiedAt: true,
        settlementBankCode: true,
        settlementAccountLast4: true,
        settlementAccountHolder: true,
        name: true,
      },
    });

    let payoutBank = bank;
    if (!payoutBank && verified?.bankVerifiedAt && verified.settlementBankCode) {
      const { apickBankLabel } = await import("@/lib/apick/bank-codes");
      payoutBank = {
        id: "verified",
        userId: user.id,
        bankName: apickBankLabel(verified.settlementBankCode) ?? verified.settlementBankCode,
        accountNumber: verified.settlementAccountLast4 ?? "",
        holderName: verified.settlementAccountHolder ?? verified.name ?? "",
        createdAt: verified.bankVerifiedAt!,
        updatedAt: verified.bankVerifiedAt!,
      };
    }
    if (!payoutBank) return { error: "출금 계좌를 먼저 등록해 주세요." };

    const wallet = await db.wallet.findUnique({ where: { userId: user.id } });
    const available = wallet?.availableBalance ?? 0;
    const pending = await db.payoutRequest.aggregate({
      where: { userId: user.id, status: { in: ["PENDING", "APPROVED"] } },
      _sum: { amount: true },
    });
    const reserved = pending._sum.amount ?? 0;
    if (amount > available - reserved) {
      return { error: "출금 가능 잔액이 부족합니다." };
    }

    await db.$transaction(async (tx) => {
      const w = await tx.wallet.update({
        where: { userId: user.id },
        data: { availableBalance: { decrement: amount } },
      });
      await tx.payoutRequest.create({
        data: {
          userId: user.id,
          amount,
          bankName: payoutBank.bankName,
          accountNumber: payoutBank.accountNumber,
          holderName: payoutBank.holderName,
        },
      });
      await tx.ledgerEntry.create({
        data: {
          userId: user.id,
          type: "PAYOUT_REQUEST",
          amount,
          balanceAfter: w.availableBalance,
          memo: "출금 신청",
        },
      });
    });

    revalidatePath("/wallet");
    revalidatePath("/support");
    revalidatePath("/admin/finance");
    return { success: true };
  } catch {
    return { error: "출금 신청에 실패했습니다." };
  }
}
