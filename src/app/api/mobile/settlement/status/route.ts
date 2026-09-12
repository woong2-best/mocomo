import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { getCreatorSettlementStatusForUser } from "@/lib/settlement-register-service";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-settlement-status", 40);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const status = await getCreatorSettlementStatusForUser(auth.user.id);
  return NextResponse.json(status);
}
