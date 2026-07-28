import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { listMobileDmInbox } from "@/lib/chat-dm-service";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-messages-inbox", 60);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req);
  if ("error" in authResult) return authResult.error;

  const rooms = await listMobileDmInbox(authResult.user.id);
  return NextResponse.json({ rooms });
}
