import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { syncMobileRoomMessages } from "@/lib/chat-dm-service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-messages-sync", 120);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req);
  if ("error" in authResult) return authResult.error;

  const { roomId } = await params;
  if (!roomId || roomId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const after = req.nextUrl.searchParams.get("after");
  const result = await syncMobileRoomMessages(authResult.user.id, roomId, after);
  if ("error" in result) {
    const status = result.error === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json(result);
}
