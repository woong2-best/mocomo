import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { syncMobileRoomMessages } from "@/lib/chat-dm-service";

const POLL_MS = 350;
const MAX_WAIT_MS = 9000;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-messages-wait", 60);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req);
  if ("error" in authResult) return authResult.error;

  const { roomId } = await params;
  if (!roomId || roomId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const after = req.nextUrl.searchParams.get("after");
  const started = Date.now();

  while (Date.now() - started < MAX_WAIT_MS) {
    if (req.signal.aborted) {
      return NextResponse.json({ messages: [] });
    }
    const result = await syncMobileRoomMessages(authResult.user.id, roomId, after);
    if ("error" in result) {
      const status = result.error === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }
    if (result.messages.length > 0) {
      return NextResponse.json(result);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }

  return NextResponse.json({ messages: [] });
}
