import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getMobileUserId } from "@/lib/api-mobile-auth";
import { db } from "@/lib/db";
import { isPubliclyLive } from "@/lib/live-channel-active";

export type MobileLiveAlertItem = {
  id: string;
  kind: "tip" | "cheer";
  username: string;
  amount: number;
  message: string | null;
  at: string;
  eventType?: string;
  rouletteLabel?: string;
  /** true = live page tip, false = profile/other during broadcast */
  viaLivePage?: boolean;
};

/**
 * Mobile live overlay — ALL tips to the host since stream start (incl. profile tips),
 * plus CP cheers on this channel. Not OBS / not live-page-only.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-live-alerts", 120);
  if (limited) return limited;

  const viewerId = await getMobileUserId(req);
  if (!viewerId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id: channelId } = await params;
  if (!channelId || channelId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: {
      createdBy: true,
      createdAt: true,
      isLive: true,
      liveStatus: true,
      donationAlertsOnStream: true,
    },
  });
  if (!channel) {
    return NextResponse.json({ error: "라이브를 찾을 수 없습니다." }, { status: 404 });
  }

  const onAir = isPubliclyLive({
    isLive: channel.isLive,
    liveStatus: channel.liveStatus ?? undefined,
  });
  if (!onAir || !channel.donationAlertsOnStream) {
    return NextResponse.json({ alerts: [], serverTime: Date.now() });
  }

  const sinceParam = req.nextUrl.searchParams.get("since");
  const sinceMs = sinceParam ? Number(sinceParam) : NaN;
  const sinceDate = Number.isFinite(sinceMs)
    ? new Date(sinceMs)
    : new Date(channel.createdAt.getTime() - 5_000);

  const [tips, cheers] = await Promise.all([
    db.tip.findMany({
      where: {
        receiverId: channel.createdBy,
        createdAt: { gt: sinceDate },
      },
      orderBy: { createdAt: "asc" },
      take: 20,
      select: {
        id: true,
        amount: true,
        message: true,
        channelId: true,
        createdAt: true,
        sender: { select: { username: true } },
      },
    }),
    db.liveSupportEvent.findMany({
      where: { channelId, createdAt: { gt: sinceDate } },
      orderBy: { createdAt: "asc" },
      take: 20,
      select: {
        id: true,
        type: true,
        amount: true,
        message: true,
        metadata: true,
        createdAt: true,
        sender: { select: { username: true } },
      },
    }),
  ]);

  const alerts: MobileLiveAlertItem[] = [
    ...tips.map((t) => ({
      id: t.id,
      kind: "tip" as const,
      username: t.sender.username,
      amount: t.amount,
      message: t.message,
      at: t.createdAt.toISOString(),
      viaLivePage: !!t.channelId,
    })),
    ...cheers.map((c) => ({
      id: c.id,
      kind: "cheer" as const,
      username: c.sender.username,
      amount: c.amount,
      message: c.message,
      at: c.createdAt.toISOString(),
      eventType: c.type,
      rouletteLabel:
        typeof (c.metadata as { rouletteLabel?: string } | null)?.rouletteLabel === "string"
          ? (c.metadata as { rouletteLabel: string }).rouletteLabel
          : undefined,
    })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  return NextResponse.json({
    alerts: alerts.slice(-16),
    serverTime: Date.now(),
  });
}
