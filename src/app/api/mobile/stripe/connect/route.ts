import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { getCreatorSettlementStatusForUser } from "@/lib/settlement-register-service";

/** @deprecated — GET /api/mobile/settlement/status 사용 */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-stripe-connect-status", 40);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const status = await getCreatorSettlementStatusForUser(auth.user.id);
  return NextResponse.json({
    stripeOnboardingCompleted: status.payoutsEnabled,
    registered: status.registered,
    settlementMocoPoints: status.settlementMocoPoints,
    needsExpressMigration: status.needsExpressMigration,
    taxReportingReady: status.taxReportingReady,
  });
}

/** @deprecated Custom Connect 제거 — POST /api/mobile/settlements/connect-account 사용 */
export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-stripe-connect-onboard", 10);
  if (limited) return limited;

  return NextResponse.json(
    {
      error:
        "Direct in-app bank registration (Custom Connect) is no longer supported. Use Stripe Express onboarding.",
      code: "CUSTOM_CONNECT_DEPRECATED",
      redirect: "/api/mobile/settlements/connect-account",
    },
    { status: 410 }
  );
}
