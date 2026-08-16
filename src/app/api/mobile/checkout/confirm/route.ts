import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { confirmStripeCheckoutForUser } from "@/lib/stripe-checkout-service";
import { isPaymentsConfigured } from "@/lib/payments";

const confirmSchema = z.object({
  sessionId: z.string().min(8).max(256),
});

/** Confirm Stripe Checkout after mobile AuthSession return */
export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-checkout-confirm", 40);
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

  const parsed = confirmSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "sessionId가 필요합니다." }, { status: 400 });
  }

  const result = await confirmStripeCheckoutForUser(auth.user.id, parsed.data.sessionId);
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({
    ok: true,
    type: result.type,
    alreadyPaid: result.alreadyPaid,
  });
}
