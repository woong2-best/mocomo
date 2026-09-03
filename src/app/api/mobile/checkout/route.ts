import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { PaymentIntentType } from "@prisma/client";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { db } from "@/lib/db";
import { createStripeCheckoutForUser } from "@/lib/stripe-checkout-service";
import { isPaymentsConfigured, PREMIUM_USD_CENTS } from "@/lib/payments";

const checkoutSchema = z.object({
  type: z.string().min(1),
  amount: z.number().int().positive(),
  orderName: z.string().min(1).max(200),
  metadata: z.record(z.unknown()).default({}),
  purchaseTermsAccepted: z.literal(true),
});

/** Bearer auth — Stripe Checkout URL for mobile app */
export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-checkout", 30);
  if (limited) return limited;

  if (!isPaymentsConfigured()) {
    return NextResponse.json({ error: "결제가 설정되지 않았습니다." }, { status: 503 });
  }

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값을 확인해 주세요." }, { status: 400 });
  }

  const dbUser = await db.user.findUnique({
    where: { id: auth.user.id },
    select: { email: true },
  });

  const result = await createStripeCheckoutForUser({
    userId: auth.user.id,
    email: dbUser?.email,
    type: parsed.data.type as PaymentIntentType,
    amount: parsed.data.amount,
    orderName: parsed.data.orderName,
    metadata: parsed.data.metadata,
    platform: "mobile",
    purchaseTermsAccepted: true,
  });

  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json(result);
}

/** Payment config + packages for mobile UI */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-checkout-meta", 60);
  if (limited) return limited;

  return NextResponse.json({
    configured: isPaymentsConfigured(),
    premiumUsdCents: PREMIUM_USD_CENTS,
  });
}
