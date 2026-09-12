import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { db } from "@/lib/db";
import { createStripeCheckoutForUser } from "@/lib/stripe-checkout-service";
import {
  GEM_PURCHASE_TERMS_COPY,
  MAX_MOCO_TOPUP_COUNT,
  MIN_MOCO_TOPUP_COUNT,
  quoteGemTopup,
} from "@/lib/gems/constants";
import { getUserGemBalance } from "@/lib/gems/balance";
import { payCheckoutWithGemsFromOrder } from "@/lib/gems/checkout-pay";
import { processRefundRequest } from "@/lib/gems/refund";

/** GET — gem balance + packages */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-gems", 60);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const [balance, purchases] = await Promise.all([
    getUserGemBalance(auth.user.id),
    db.gemPurchase.findMany({
      where: { fanId: auth.user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        gems: true,
        remainingGems: true,
        krwAmount: true,
        refunded: true,
        refundedUsd: true,
        createdAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    balance,
    minTopupMoco: MIN_MOCO_TOPUP_COUNT,
    maxTopupMoco: MAX_MOCO_TOPUP_COUNT,
    termsCopy: GEM_PURCHASE_TERMS_COPY,
    purchases: purchases.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
    })),
  });
}

const topupSchema = z.object({
  action: z.literal("topup"),
  moco: z.number().int().positive(),
  purchaseTermsAccepted: z.literal(true),
});

const paySchema = z.object({
  action: z.literal("pay"),
  orderId: z.string().min(1).max(64),
  purchaseTermsAccepted: z.literal(true),
});

const refundSchema = z.object({
  action: z.literal("refund"),
  gemPurchaseId: z.string().min(1),
});

const bodySchema = z.discriminatedUnion("action", [topupSchema, paySchema, refundSchema]);

/** POST — topup / pay / refund */
export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-gems-write", 30);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값을 확인해 주세요." }, { status: 400 });
  }

  const data = parsed.data;

  if (data.action === "topup") {
    const quote = quoteGemTopup(data.moco);
    if (!quote.ok) {
      return NextResponse.json({ error: quote.error }, { status: 422 });
    }
    const dbUser = await db.user.findUnique({
      where: { id: auth.user.id },
      select: { email: true },
    });
    const result = await createStripeCheckoutForUser({
      userId: auth.user.id,
      email: dbUser?.email,
      type: "GEM_TOPUP",
      amount: quote.usdCents,
      orderName: quote.orderName,
      metadata: { gemAmount: quote.moco },
      platform: "mobile",
      purchaseTermsAccepted: true,
    });
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }
    return NextResponse.json(result);
  }

  if (data.action === "pay") {
    const result = await payCheckoutWithGemsFromOrder(auth.user.id, data.orderId, {
      purchaseTermsAccepted: true,
      platform: "mobile",
    });
    if ("error" in result && result.error) {
      const messages: Record<string, string> = {
        INSUFFICIENT_GEMS_BALANCE: "MOCO 잔액이 부족합니다.",
        INSUFFICIENT_MOCO_BALANCE: "MOCO 잔액이 부족합니다.",
      };
      return NextResponse.json(
        { error: messages[result.error] ?? result.error },
        { status: 422 }
      );
    }
    if ("success" in result && result.success) {
      return NextResponse.json({
        success: true,
        type: result.type,
        redirectPath: result.redirectPath,
        balance: "balance" in result ? result.balance : undefined,
      });
    }
    return NextResponse.json({ error: "결제에 실패했습니다." }, { status: 500 });
  }

  const refund = await processRefundRequest(data.gemPurchaseId, auth.user.id);
  const code = "error" in refund ? refund.error : "REFUND_NOT_ALLOWED";
  const messages: Record<string, string> = {
    UNAUTHORIZED: "환불 권한이 없습니다.",
    REFUND_NOT_ALLOWED: "구매 MOCO는 환불할 수 없습니다.",
  };
  return NextResponse.json({ error: messages[code] ?? code }, { status: 422 });
}
