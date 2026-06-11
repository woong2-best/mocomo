import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveLiveChannelAccess } from "@/lib/live-room-access";
import { getCachedLiveTipsForChannel } from "@/lib/cached-live-tips";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { channelId } = await params;
  const access = await resolveLiveChannelAccess(channelId, session.user.id);
  if (!access.allowed) {
    return NextResponse.json({ error: "NOT_MEMBER" }, { status: 403 });
  }

  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { createdBy: true, createdAt: true },
  });
  if (!channel) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const sinceParam = req.nextUrl.searchParams.get("since");
  const sinceMs = sinceParam ? Number(sinceParam) : NaN;
  const sinceDate = Number.isFinite(sinceMs)
    ? new Date(sinceMs)
    : new Date(Date.now() - 120_000);

  const [{ tipTotalKrw, tipRanking }, recentRows] = await Promise.all([
    getCachedLiveTipsForChannel(channel.createdBy, channel.createdAt),
    db.tip
      .findMany({
        where: {
          receiverId: channel.createdBy,
          createdAt: { gt: sinceDate },
          OR: [{ channelId }, { channelId: null, createdAt: { gte: channel.createdAt } }],
        },
        orderBy: { createdAt: "asc" },
        take: 8,
        select: {
          id: true,
          amount: true,
          message: true,
          createdAt: true,
          channelId: true,
          sender: { select: { username: true } },
        },
      })
      .catch(() => []),
  ]);

  const recentTips = recentRows.map((t) => ({
    id: t.id,
    amount: t.amount,
    message: t.message,
    username: t.sender.username,
    at: t.createdAt.getTime(),
  }));

  return NextResponse.json({
    ok: true,
    tipTotalKrw,
    tipRanking,
    recentTips,
    serverTime: Date.now(),
  });
}
