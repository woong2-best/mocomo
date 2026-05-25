"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getPlatformFinanceStats } from "@/lib/settlement";

export async function getFinanceDashboard() {
  await requireAdmin();
  const stats = await getPlatformFinanceStats();

  try {
    const [recentPayments, pendingPayouts] = await Promise.all([
      db.paymentIntent.findMany({
        where: { status: "PAID" },
        orderBy: { paidAt: "desc" },
        take: 30,
        include: { user: { select: { username: true } } },
      }),
      db.payoutRequest.findMany({
        where: { status: { in: ["PENDING", "APPROVED"] } },
        orderBy: { createdAt: "asc" },
        take: 50,
        include: { user: { select: { username: true, email: true } } },
      }),
    ]);
    return { stats, recentPayments, pendingPayouts };
  } catch {
    return { stats, recentPayments: [], pendingPayouts: [] };
  }
}

export async function markPayoutPaid(payoutId: string, adminNote?: string) {
  const admin = await requireAdmin();
  const payout = await db.payoutRequest.findUnique({ where: { id: payoutId } });
  if (!payout) return { error: "출금 요청을 찾을 수 없습니다." };
  if (payout.status === "PAID") return { success: true };
  if (payout.status === "REJECTED") return { error: "거절된 요청입니다." };

  await db.$transaction(async (tx) => {
    await tx.payoutRequest.update({
      where: { id: payoutId },
      data: {
        status: "PAID",
        processedById: admin.id,
        processedAt: new Date(),
        adminNote: adminNote?.trim() || "입금 완료",
      },
    });
    await tx.wallet.update({
      where: { userId: payout.userId },
      data: { totalWithdrawn: { increment: payout.amount } },
    });
  });

  revalidatePath("/admin/finance");
  revalidatePath("/wallet");
  return { success: true };
}

export async function rejectPayout(payoutId: string, reason: string) {
  const admin = await requireAdmin();
  const payout = await db.payoutRequest.findUnique({ where: { id: payoutId } });
  if (!payout) return { error: "출금 요청을 찾을 수 없습니다." };
  if (payout.status === "PAID") return { error: "이미 지급 완료된 요청입니다." };

  await db.$transaction(async (tx) => {
    const wallet = await tx.wallet.update({
      where: { userId: payout.userId },
      data: { availableBalance: { increment: payout.amount } },
    });
    await tx.payoutRequest.update({
      where: { id: payoutId },
      data: {
        status: "REJECTED",
        processedById: admin.id,
        processedAt: new Date(),
        adminNote: reason.trim() || "반려",
      },
    });
    await tx.ledgerEntry.create({
      data: {
        userId: payout.userId,
        type: "PAYOUT_REJECTED",
        amount: payout.amount,
        balanceAfter: wallet.availableBalance,
        referenceType: "payout",
        referenceId: payoutId,
        memo: reason.trim() || "출금 반려 환급",
      },
    });
  });

  revalidatePath("/admin/finance");
  revalidatePath("/wallet");
  return { success: true };
}
