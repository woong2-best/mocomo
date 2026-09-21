import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { createStripeCheckoutForUser } from "@/lib/stripe-checkout-service";
import { quoteGemTopup } from "@/lib/gems/constants";
import { gemTopupStripeMetadata } from "@/lib/gems/topup-metadata";
import { quoteMocoTopupLedger } from "@/lib/moco/stripe-pass-through";

const bodySchema = z.object({
  moco: z.number().int().positive(),
  purchaseTermsAccepted: z.literal(true),
});

/** MOCO 충전 — PG 패스스루 gross + Stripe Checkout 세션 */
export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "payment-checkout", 30);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

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

  const quote = quoteGemTopup(parsed.data.moco);
  if (!quote.ok) {
    return NextResponse.json({ error: quote.error }, { status: 422 });
  }

  const ledger = quoteMocoTopupLedger(quote.moco);

  const checkout = await createStripeCheckoutForUser({
    userId: session.user.id,
    email: session.user.email,
    type: "GEM_TOPUP",
    amount: quote.usdCents,
    orderName: quote.orderName,
    metadata: gemTopupStripeMetadata(quote),
    purchaseTermsAccepted: true,
    platform: "web",
  });

  if ("error" in checkout && checkout.error) {
    return NextResponse.json({ error: checkout.error }, { status: 422 });
  }

  return NextResponse.json({
    ...checkout,
    quote: {
      moco: quote.moco,
      basePriceCents: ledger.basePriceCents,
      pgFeeCents: ledger.pgFeeCents,
      grossAmountCents: ledger.grossAmountCents,
      platformRevenueCents: ledger.platformRevenueCents,
      creatorAllocationCents: ledger.creatorAllocationCents,
    },
  });
}
