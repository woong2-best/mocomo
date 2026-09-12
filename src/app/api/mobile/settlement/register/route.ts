import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { registerCreatorSettlementForUser } from "@/lib/settlement-register-service";
import { getRequestIp } from "@/lib/request-ip";

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-settlement-register", 5);
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
