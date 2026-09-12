"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getWalletSummary, MIN_PAYOUT_KRW } from "@/lib/settlement";
import { formatUsd } from "@/lib/money";
import { getWalletEarningsAnalytics } from "@/lib/wallet-analytics";
import { getPaymentHistoryForUser, type PaymentHistoryItem } from "@/lib/payment-history";

export type { PaymentHistoryItem };

export async function getMyWallet() {
  const user = await requireAuth();
  return getWalletSummary(user.id);
}

export async function getMyWalletEarnings(year?: number) {
  const user = await requireAuth();
  try {
    return await getWalletEarningsAnalytics(user.id, year);
  } catch (e) {
    console.error("[getMyWalletEarnings]", e);
    const currentYear = new Date().getFullYear();
    const y = year && year >= 2000 && year <= currentYear + 1 ? year : currentYear;
    return {
      year: y,
      years: [y],
      months: [],
      transactions: [],
      yearEarned: 0,
      yearWithdrawn: 0,
      yearNet: 0,
      bySource: [],
      summary: {
        availableBalance: 0,
        totalEarned: 0,
        totalWithdrawn: 0,
        pendingPayout: 0,
        withdrawable: 0,
      },
    };
  }
}

export async function getMyPaymentHistory() {
  const user = await requireAuth();
  try {
    return await getPaymentHistoryForUser(user.id);
  } catch (e) {
    console.error("[getMyPaymentHistory]", e);
    return [];
  }
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

/** @deprecated 월말 자동 Reward 지급으로 대체 */
export async function requestPayout(_amount: number) {
  await requireAuth();
  return {
    error:
      "수동 출금은 지원하지 않습니다. 정산 MOCO는 매월 말 크리에이터 활동 성과 보수(Reward)로 자동 지급됩니다.",
  };
}
