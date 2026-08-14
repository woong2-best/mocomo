import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { listCreatorSellerListingsForUser } from "@/lib/marketplace/mobile-market-hub";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-market-creator-items", 40);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "notification" });
  if ("error" in auth) return auth.error;

  const data = await listCreatorSellerListingsForUser(auth.user.id);
  return NextResponse.json(data);
}
