import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { getCreatorSettlementStatusForUser } from "@/lib/settlement-register-service";
import { registerCreatorSettlementForUser } from "@/lib/settlement-register-service";
import { getRequestIp } from "@/lib/request-ip";

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
  });
}

/** @deprecated — POST /api/mobile/settlement/register 사용 */
export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-stripe-connect-onboard", 10);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "정산 등록 정보가 필요합니다." }, { status: 400 });
  }

  const ip = await getRequestIp();
  const userAgent = req.headers.get("user-agent") ?? undefined;
  const result = await registerCreatorSettlementForUser(auth.user.id, body, { ip, userAgent });
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }
  return NextResponse.json(result);
}
