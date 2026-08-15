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
  const { MIN_PAYOUT_KRW } = await import("@/lib/settlement");
  const { apickBankLabel } = await import("@/lib/apick/bank-codes");

  const userId = auth.user.id;
  const amount = parsed.data.amount;

  if (amount < MIN_PAYOUT_KRW) {
    return NextResponse.json(
      { error: `최소 출금 금액은 ${MIN_PAYOUT_KRW.toLocaleString()}원입니다.` },
      { status: 400 }
    );
  }

  try {
    const bank = await db.bankAccount.findUnique({ where: { userId } });
    const verified = await db.user.findUnique({
      where: { id: userId },
      select: {
        bankVerifiedAt: true,
        settlementBankCode: true,
        settlementAccountLast4: true,
        settlementAccountHolder: true,
        name: true,
      },
    });

    let payoutBank: { bankName: string; accountNumber: string; holderName: string } | null = bank;
    if (!payoutBank && verified?.bankVerifiedAt && verified.settlementBankCode) {
      payoutBank = {
        bankName: apickBankLabel(verified.settlementBankCode) ?? verified.settlementBankCode,
        accountNumber: verified.settlementAccountLast4 ?? "",
        holderName: verified.settlementAccountHolder ?? verified.name ?? "",
      };
    }
    if (!payoutBank) {
      return NextResponse.json({ error: "출금 계좌를 먼저 등록해 주세요." }, { status: 400 });
    }

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
          bankName: payoutBank!.bankName,
          accountNumber: payoutBank!.accountNumber,
          holderName: payoutBank!.holderName,
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
