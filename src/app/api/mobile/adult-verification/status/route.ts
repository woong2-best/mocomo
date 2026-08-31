import { NextRequest, NextResponse } from "next/server";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { isAdultVerified } from "@/lib/adult-verification/is-verified";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-adult-verification-status", 60);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req);
  if ("error" in authResult) return authResult.error;

  const user = await db.user.findUnique({
    where: { id: authResult.user.id },
    select: { adultVerifiedAt: true },
  });

  return NextResponse.json({
    isAdult: isAdultVerified(user ?? { adultVerifiedAt: null }),
    adultVerifiedAt: user?.adultVerifiedAt?.toISOString() ?? null,
  });
}
