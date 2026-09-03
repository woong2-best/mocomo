import { NextRequest, NextResponse } from "next/server";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import {
  canAccessPaidAdultContent,
  canViewNsfwContent,
  nsfwViewerSelect,
} from "@/lib/nsfw-viewer-access";

/** Global age gate status — birthDate-based, no PortOne. */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-adult-verification-status", 60);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req);
  if ("error" in authResult) return authResult.error;

  const user = await db.user.findUnique({
    where: { id: authResult.user.id },
    select: {
      ...nsfwViewerSelect,
      birthDate: true,
      stripeCustomerId: true,
      stripeConnectAccountId: true,
      stripeConnectOnboardedAt: true,
    },
  });

  const isAdult = canViewNsfwContent(user);
  const canAccessPaid = await canAccessPaidAdultContent(authResult.user.id, user);

  return NextResponse.json({
    isAdult,
    /** @deprecated PortOne removed — always null; use birthDate on profile. */
    adultVerifiedAt: null,
    hasBirthDate: !!user?.birthDate,
    canAccessPaidAdult: canAccessPaid,
  });
}
