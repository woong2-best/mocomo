import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { db } from "@/lib/db";
import {
  createMarketplaceCheckoutSessionForPaymentIntent,
  prepareMarketplacePaymentForBuyer,
} from "@/actions/marketplace-checkout";
import { confirmCheckoutPaymentIntent, payCheckoutWithSavedMethod } from "@/lib/stripe-pay-intent-service";
import { isPaymentsConfigured } from "@/lib/payments";
import { stripePaymentAuthenticateUrl } from "@/lib/stripe-payment-return-url";
import { getMarketplaceCheckoutEligibility } from "@/lib/marketplace/checkout-eligibility";

const checkoutBodySchema = z.object({
  quantity: z.number().int().positive().optional(),
  optionSnapshot: z.record(z.string()).optional(),
  shipName: z.string().max(80).optional(),
  shipCountry: z.string().max(8).optional(),
  shipPostal: z.string().max(32).optional(),
  shipAddress1: z.string().max(200).optional(),
  shipAddress2: z.string().max(200).optional(),
  shipPhone: z.string().max(32).optional(),
  buyerNote: z.string().max(500).optional(),
});

const patchSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("saved"),
    orderId: z.string().min(1),
    paymentMethodId: z.string().min(1),
    purchaseTermsAccepted: z.literal(true),
  }),
  z.object({
    mode: z.literal("finalize"),
    orderId: z.string().min(1),
  }),
  z.object({
    mode: z.literal("checkout"),
    orderId: z.string().min(1),
    purchaseTermsAccepted: z.literal(true),
  }),
]);

/** Star market listing checkout — saved cards first */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-market-checkout", 20);
  if (limited) return limited;

  if (!isPaymentsConfigured()) {
    return NextResponse.json({ error: "결제가 설정되지 않았습니다." }, { status: 503 });
  }

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  const { id: listingId } = await params;
  if (!listingId || listingId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    json = {};
  }

  const parsed = checkoutBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값을 확인해 주세요." }, { status: 400 });
  }

  const eligibility = await getMarketplaceCheckoutEligibility({
    listingId,
    userId: auth.user.id,
    shipCountry: parsed.data.shipCountry,
    headers: req.headers,
  });
  if ("error" in eligibility) {
    return NextResponse.json({ error: eligibility.error }, { status: 404 });
  }
  if (eligibility.mode === "BLOCKED" || eligibility.blocked) {
    return NextResponse.json(
      { error: eligibility.disclaimer, checkoutMode: "BLOCKED" },
      { status: 403 }
    );
  }
  if (!eligibility.sellerReady) {
    return NextResponse.json(
      { error: eligibility.sellerReadyMessage ?? "판매자 결제 준비가 완료되지 않았습니다." },
      { status: 422 }
    );
  }

  const dbUser = await db.user.findUnique({
    where: { id: auth.user.id },
    select: { email: true, countryCode: true },
  });

  const result = await prepareMarketplacePaymentForBuyer(
    { id: auth.user.id, email: dbUser?.email, countryCode: dbUser?.countryCode },
    { listingId, ...parsed.data },
    "mobile"
  );

  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json(result);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-market-checkout-confirm", 30);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  const { id: listingId } = await params;
  if (!listingId) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값을 확인해 주세요." }, { status: 400 });
  }

  const dbUser = await db.user.findUnique({
    where: { id: auth.user.id },
    select: { email: true },
  });

  if (parsed.data.mode === "checkout") {
    const result = await createMarketplaceCheckoutSessionForPaymentIntent(
      { id: auth.user.id, email: dbUser?.email },
      parsed.data.orderId,
      "mobile",
      { purchaseTermsAccepted: true }
    );
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
    parsed.data.paymentMethodId,
    { purchaseTermsAccepted: true, platform: "mobile" }
  );

  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  if ("requiresAction" in result && result.requiresAction && result.clientSecret) {
    const authenticateUrl = stripePaymentAuthenticateUrl(
      result.orderId,
      result.clientSecret,
      "mocomo://payment/success"
    );
    return NextResponse.json({ requiresAction: true, authenticateUrl, orderId: result.orderId });
  }

  return NextResponse.json(result);
}
