import { NextResponse } from "next/server";
import { isPaymentsConfigured } from "@/lib/payments";

/** Stripe 후원·결제 설정 여부 */
export async function GET() {
  const configured = isPaymentsConfigured();
  return NextResponse.json({
    configured,
    provider: "stripe",
    hint: configured
      ? "프로필·/support 에서 후원 가능"
      : "Vercel에 STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET 설정",
  });
}
