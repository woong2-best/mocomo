import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyOverlayToken } from "@/lib/live-external/overlay-token";
import { rateLimitPublicApi } from "@/lib/api-security";

/** Read-only chat feed for OBS overlay (token auth, no session). */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const limited = await rateLimitPublicApi(req, "overlay-chat", 120);
  if (limited) return limited;

  const { channelId } = await params;
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const since = req.nextUrl.searchParams.get("since");

  const verified = verifyOverlayToken(token, { channelId, kind: "chat" });
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: 401 });
  }

  const sinceDate = since ? new Date(since) : new Date(Date.now() - 5 * 60_000);
  if (Number.isNaN(sinceDate.getTime())) {
    return NextResponse.json({ error: "since 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const messages = await db.liveChatMessage.findMany({
    where: {
      channelId,
      createdAt: { gt: sinceDate },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
    select: {
      id: true,
      content: true,
      createdAt: true,
      user: { select: { username: true } },
    },
  });

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      username: m.user.username,
      content: m.content,
      at: m.createdAt.toISOString(),
    })),
  });
}
