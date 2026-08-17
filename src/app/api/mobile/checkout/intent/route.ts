import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { PaymentIntentType } from "@prisma/client";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { db } from "@/lib/db";
import { isPaymentsConfigured } from "@/lib/payments";
import {
  confirmCheckoutPaymentIntent,
  payCheckoutWithSavedMethod,
  prepareCheckoutPaymentIntent,
} from "@/lib/stripe-pay-intent-service";
import { createStripeCheckoutForUser } from "@/lib/stripe-checkout-service";
import { getAppOrigin } from "@/lib/stripe";

const prepareSchema = z.object({
  type: z.string().min(1),
  amount: z.number().int().positive(),
  orderName: z.string().min(1).max(200),
  metadata: z.record(z.unknown()).default({}),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-checkout-intent", 30);
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

  const parsed = prepareSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값을 확인해 주세요." }, { status: 400 });
  }

  try {
    const dbUser = await db.user.findUnique({
      where: { id: auth.user.id },
      select: { email: true },
    });

    const result = await prepareCheckoutPaymentIntent({
      userId: auth.user.id,
      email: dbUser?.email,
      type: parsed.data.type as PaymentIntentType,
      amount: parsed.data.amount,
      orderName: parsed.data.orderName,
      metadata: parsed.data.metadata,
    });

    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error("[api/mobile/checkout/intent] POST", e);
    return NextResponse.json(
      { error: "결제 준비 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}

const confirmSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("saved"),
    orderId: z.string().min(1),
    paymentMethodId: z.string().min(1),
  }),
  z.object({
    mode: z.literal("finalize"),
    orderId: z.string().min(1),
  }),
  z.object({
    mode: z.literal("checkout"),
    type: z.string().min(1),
    amount: z.number().int().positive(),
    orderName: z.string().min(1).max(200),
    metadata: z.record(z.unknown()).default({}),
  }),
]);

export async function PATCH(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-checkout-intent-confirm", 30);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = confirmSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값을 확인해 주세요." }, { status: 400 });
  }

  if (parsed.data.mode === "checkout") {
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
    });
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }
    return NextResponse.json(result);
  }

  if (parsed.data.mode === "finalize") {
    const result = await confirmCheckoutPaymentIntent(auth.user.id, parsed.data.orderId);
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }
    return NextResponse.json(result);
  }

  const result = await payCheckoutWithSavedMethod(
    auth.user.id,
    parsed.data.orderId,
    parsed.data.paymentMethodId
  );

  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  if ("requiresAction" in result && result.requiresAction && result.clientSecret) {
    const origin = getAppOrigin();
    const authenticateUrl = `${origin}/payments/authenticate?client_secret=${encodeURIComponent(result.clientSecret)}&order_id=${encodeURIComponent(result.orderId)}&return_to=${encodeURIComponent("mocomo://payment/success")}`;
    return NextResponse.json({ requiresAction: true, authenticateUrl, orderId: result.orderId });
  }

  return NextResponse.json(result);
}
