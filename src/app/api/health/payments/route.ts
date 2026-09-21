import { NextRequest, NextResponse } from "next/server";
import { isPaymentsConfigured } from "@/lib/payments";
import { guardSensitiveHealthEndpoint } from "@/lib/api-security";
import { runStripeDiagnostics } from "@/lib/stripe-diagnostics";

/** Stripe 후원·결제 설정 여부 (+ dev/CRON 시 API 프로브) */
export async function GET(req: NextRequest) {
  const denied = guardSensitiveHealthEndpoint(req);
  if (denied) return denied;

  const configured = isPaymentsConfigured();
  const diagnostics = configured ? await runStripeDiagnostics() : null;

  return NextResponse.json({
    configured,
    provider: "stripe",
    hint: configured
      ? "프로필·/support · /admin/finance/stripe-verify 에서 테스트 가능"
      : "STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY 설정",
    diagnostics: diagnostics
      ? {
          keyMode: diagnostics.keyMode,
          apiOk: diagnostics.apiOk,
          webhookSecretPresent: diagnostics.webhookSecretPresent,
          chargesEnabled: diagnostics.chargesEnabled,
          apiError: diagnostics.apiError,
        }
      : null,
  });
}
