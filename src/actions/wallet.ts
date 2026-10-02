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
    return { error: "actions.s1h4k40u" };
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
    return { error: "actions.db_l" };
  }
}

/** @deprecated 월말 자동 Reward 지급으로 대체 */
export async function requestPayout(_amount: number) {
  await requireAuth();
  return {
    error: "actions.moco_reward",
  };
}
