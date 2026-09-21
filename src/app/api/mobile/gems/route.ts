import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { db } from "@/lib/db";
import { createStripeCheckoutForUser } from "@/lib/stripe-checkout-service";
import {
  GEM_PURCHASE_TERMS_COPY,
  MIN_MOCO_TOPUP_COUNT,
  quoteGemTopup,
} from "@/lib/gems/constants";
import { gemTopupStripeMetadata } from "@/lib/gems/topup-metadata";
import { getUserGemBalance } from "@/lib/gems/balance";
import { getMocoBalanceSnapshot } from "@/lib/auction-deposit/service";
import { processRefundRequest } from "@/lib/gems/refund";

/** GET — gem balance + packages (balance = web/mobile 동일 availableMoco) */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-gems", 60);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const [snap, gemOnly, purchases] = await Promise.all([
    getMocoBalanceSnapshot(auth.user.id),
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
    /** Canonical MOCO total — same as web getMocoBalanceSnapshot.availableMocoBalance */
    balance: snap.availableMocoBalance,
    gemBalance: gemOnly,
    mocoPointsBalance: snap.mocoPointsBalance,
    availableMocoBalance: snap.availableMocoBalance,
    minTopupMoco: MIN_MOCO_TOPUP_COUNT,
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
      metadata: gemTopupStripeMetadata(quote),
      platform: "mobile",
      purchaseTermsAccepted: true,
    });
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }
    return NextResponse.json(result);
  }

  if (data.action === "pay") {
    return NextResponse.json(
      { error: "모바일 앱에서는 MOCO 바로 결제를 사용할 수 없습니다. 카드로 결제해 주세요." },
      { status: 403 }
    );
  }

  const refund = await processRefundRequest(data.gemPurchaseId, auth.user.id);
  const code = "error" in refund ? refund.error : "REFUND_NOT_ALLOWED";
  const messages: Record<string, string> = {
    UNAUTHORIZED: "환불 권한이 없습니다.",
    REFUND_NOT_ALLOWED: "구매 MOCO는 환불할 수 없습니다.",
  };
  return NextResponse.json({ error: messages[code] ?? code }, { status: 422 });
}
