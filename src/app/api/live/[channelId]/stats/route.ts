import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveLiveChannelAccess } from "@/lib/live-room-access";
import { fetchLiveTipsForChannel } from "@/lib/live-channel-meta-safe";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
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

  const { tipTotalKrw, tipRanking } = await fetchLiveTipsForChannel(
    channel.createdBy,
    channel.createdAt
  );

  const since = new Date(Date.now() - 120_000);
  let recentTips: {
    id: string;
    amount: number;
    message: string | null;
    username: string;
    at: number;
  }[] = [];

  try {
    const rows = await db.tip.findMany({
      where: {
        receiverId: channel.createdBy,
        createdAt: { gt: since },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { sender: { select: { username: true } } },
    });
    recentTips = rows.map((t) => ({
      id: t.id,
      amount: t.amount,
      message: t.message,
      username: t.sender.username,
      at: t.createdAt.getTime(),
    }));
  } catch {
    /* ignore */
  }

  return NextResponse.json({
    ok: true,
    tipTotalKrw,
    tipRanking,
    recentTips,
  });
}
