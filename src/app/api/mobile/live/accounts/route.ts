import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { db } from "@/lib/db";

/** Verified streaming accounts for go-live (Bearer). */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-live-accounts", 30);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req);
  if ("error" in authResult) return authResult.error;

  const accounts = await db.connectedStreamingAccount.findMany({
    where: {
      userId: authResult.user.id,
      verified: true,
      revokedAt: null,
      platform: { in: ["YOUTUBE", "TWITCH", "CHZZK"] },
    },
    orderBy: { channelName: "asc" },
    select: {
      id: true,
      platform: true,
      channelId: true,
      channelName: true,
      channelUrl: true,
      profileImage: true,
    },
  });

  return NextResponse.json({ accounts });
}
