import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";

const schema = z.object({
  amount: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-wallet-payout", 10);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "금액을 확인해 주세요." }, { status: 400 });
  }

  // Server action uses session auth — call underlying logic via duplicated import:
  // requestPayout uses requireAuth() which won't work with mobile bearer.
  // Use inline payout from wallet action logic instead.

  const { db } = await import("@/lib/db");
  const { MIN_PAYOUT_USD_CENTS, formatUsd } = await import("@/lib/money");

  const userId = auth.user.id;
  const amount = parsed.data.amount;

  if (amount < MIN_PAYOUT_USD_CENTS) {
    return NextResponse.json(
      { error: `최소 출금 금액은 ${formatUsd(MIN_PAYOUT_USD_CENTS)}입니다.` },
      { status: 400 }
    );
  }

  try {
    const verified = await db.user.findUnique({
      where: { id: userId },
      select: {
        stripeOnboardingCompleted: true,
        stripeConnectAccountId: true,
        name: true,
      },
    });

    if (!verified?.stripeOnboardingCompleted || !verified.stripeConnectAccountId) {
      return NextResponse.json(
        { error: "Stripe Connect 정산 계좌 연동을 먼저 완료해 주세요." },
        { status: 400 }
      );
    }

    const payoutBank = {
      bankName: "Stripe Connect",
      accountNumber: verified.stripeConnectAccountId.slice(-8),
      holderName: verified.name ?? "Stripe",
    };

    const wallet = await db.wallet.findUnique({ where: { userId } });
    const available = wallet?.availableBalance ?? 0;
    const pending = await db.payoutRequest.aggregate({
      where: { userId, status: { in: ["PENDING", "APPROVED"] } },
      _sum: { amount: true },
    });
    const reserved = pending._sum.amount ?? 0;
    if (amount > available - reserved) {
      return NextResponse.json({ error: "출금 가능 잔액이 부족합니다." }, { status: 400 });
    }

    await db.$transaction(async (tx) => {
      const w = await tx.wallet.update({
        where: { userId },
        data: { availableBalance: { decrement: amount } },
      });
      await tx.payoutRequest.create({
        data: {
          userId,
          amount,
          bankName: payoutBank.bankName,
          accountNumber: payoutBank.accountNumber,
          holderName: payoutBank.holderName,
        },
      });
      await tx.ledgerEntry.create({
        data: {
          userId,
          type: "PAYOUT_REQUEST",
          amount,
          balanceAfter: w.availableBalance,
          memo: "출금 신청",
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "출금 신청에 실패했습니다." }, { status: 500 });
  }
}
