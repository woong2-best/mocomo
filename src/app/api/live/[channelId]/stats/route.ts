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
    select: { createdBy: true, createdAt: true, donationAlertsOnStream: true },
  });
  if (!channel) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const donationAlertsOnStream = channel.donationAlertsOnStream === true;

  const sinceParam = req.nextUrl.searchParams.get("since");
  const sinceMs = sinceParam ? Number(sinceParam) : NaN;
  const sinceDate = Number.isFinite(sinceMs)
    ? new Date(sinceMs)
    : new Date(Date.now() - 120_000);

  const [{ tipTotalKrw, tipRanking }, recentRows, cheerAgg, recentCheerRows] = await Promise.all([
    getCachedLiveTipsForChannel(channel.createdBy, channel.createdAt),
    db.tip
      .findMany({
        where: {
          receiverId: channel.createdBy,
          channelId,
          createdAt: { gt: sinceDate },
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
    db.liveSupportEvent
      .aggregate({
        where: { channelId, createdAt: { gte: channel.createdAt } },
        _sum: { amount: true },
      })
      .catch(() => ({ _sum: { amount: 0 } })),
    db.liveSupportEvent
      .findMany({
        where: { channelId, createdAt: { gt: sinceDate } },
        orderBy: { createdAt: "asc" },
        take: 8,
        select: {
          id: true,
          type: true,
          amount: true,
          message: true,
          metadata: true,
          createdAt: true,
          sender: { select: { username: true } },
        },
      })
      .catch(() => []),
  ]);

  const cheerTotalCp = cheerAgg._sum.amount ?? 0;

  const cheerRankingRows = await db.liveSupportEvent
    .groupBy({
      by: ["senderId"],
      where: { channelId, createdAt: { gte: channel.createdAt } },
      _sum: { amount: true },
    })
    .catch(() => []);

  const topCheerRows = [...cheerRankingRows]
    .sort((a, b) => (b._sum.amount ?? 0) - (a._sum.amount ?? 0))
    .slice(0, 5);

  const cheerSenderIds = topCheerRows.map((r) => r.senderId);
  const cheerSenders =
    cheerSenderIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: cheerSenderIds } },
          select: { id: true, username: true },
        })
      : [];
  const cheerSenderMap = new Map(cheerSenders.map((u) => [u.id, u.username]));

  const mergedRankingMap = new Map<string, number>();
  for (const r of tipRanking) {
    mergedRankingMap.set(r.username, (mergedRankingMap.get(r.username) ?? 0) + r.amount);
  }
  for (const r of topCheerRows) {
    const username = cheerSenderMap.get(r.senderId) ?? "unknown";
    mergedRankingMap.set(username, (mergedRankingMap.get(username) ?? 0) + (r._sum.amount ?? 0));
  }
  const mergedRanking = [...mergedRankingMap.entries()]
    .map(([username, amount]) => ({ username, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const recentTips = [
    ...recentRows.map((t) => ({
      id: t.id,
      amount: t.amount,
      message: t.message,
      username: t.sender.username,
      at: t.createdAt.getTime(),
      kind: "tip" as const,
    })),
    ...recentCheerRows.map((t) => ({
      id: t.id,
      amount: t.amount,
      message: t.message,
      username: t.sender.username,
      at: t.createdAt.getTime(),
      kind: "cheer" as const,
      eventType: t.type,
      rouletteLabel:
        typeof (t.metadata as { rouletteLabel?: string } | null)?.rouletteLabel === "string"
          ? (t.metadata as { rouletteLabel: string }).rouletteLabel
          : undefined,
    })),
  ]
    .sort((a, b) => a.at - b.at)
    .slice(-12);

  return NextResponse.json({
    ok: true,
    tipTotalKrw,
    cheerTotalCp,
    combinedGoalTotal: tipTotalKrw + cheerTotalCp,
    tipRanking: mergedRanking,
    recentTips: donationAlertsOnStream ? recentTips : [],
    donationAlertsOnStream,
    serverTime: Date.now(),
  });
}
