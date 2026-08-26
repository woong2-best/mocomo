import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyOverlayToken } from "@/lib/live-external/overlay-token";
import { rateLimitPublicApi } from "@/lib/api-security";
import { assertOverlayBroadcastAccess } from "@/lib/live-external/overlay-access";

/** Read-only recent tips for OBS donation overlay (token auth). */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const limited = await rateLimitPublicApi(req, "overlay-donations", 60);
  if (limited) return limited;

  const { channelId } = await params;
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const since = req.nextUrl.searchParams.get("since");

  const verified = verifyOverlayToken(token, { channelId, kind: "donation" });
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: 401 });
  }

  const access = await assertOverlayBroadcastAccess(channelId, verified.payload);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { createdBy: true },
  });
  if (!channel) {
    return NextResponse.json({ error: "채널을 찾을 수 없습니다." }, { status: 404 });
  }

  const sinceDate = since ? new Date(since) : new Date(Date.now() - 10 * 60_000);
  if (Number.isNaN(sinceDate.getTime())) {
    return NextResponse.json({ error: "since 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const tips = await db.tip.findMany({
    where: {
      receiverId: channel.createdBy,
      channelId,
      createdAt: { gt: sinceDate },
    },
    orderBy: { createdAt: "asc" },
    take: 20,
    select: {
      id: true,
      amount: true,
      message: true,
      createdAt: true,
      sender: { select: { username: true } },
    },
  });

  return NextResponse.json({
    tips: tips.map((t) => ({
      id: t.id,
      username: t.sender.username,
      amount: t.amount,
      message: t.message,
      at: t.createdAt.toISOString(),
    })),
  });
}
