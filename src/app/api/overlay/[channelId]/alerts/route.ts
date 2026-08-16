import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyOverlayToken } from "@/lib/live-external/overlay-token";
import { rateLimitPublicApi } from "@/lib/api-security";

export type OverlayAlertItem = {
  id: string;
  kind: "tip" | "cheer" | "chat";
  username: string;
  amount: number;
  message: string | null;
  at: string;
  eventType?: string;
  rouletteLabel?: string;
};

/** OBS 브라우저 소스 — 라이브 페이지 후원·CP·채팅 알림 (token auth) */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const limited = await rateLimitPublicApi(req, "overlay-alerts", 60);
  if (limited) return limited;

  const { channelId } = await params;
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const since = req.nextUrl.searchParams.get("since");

  const verified = verifyOverlayToken(token, { channelId, kind: "donation" });
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: 401 });
  }

  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { createdBy: true, createdAt: true, donationAlertsOnStream: true },
  });
  if (!channel) {
    return NextResponse.json({ error: "채널을 찾을 수 없습니다." }, { status: 404 });
  }

  if (!channel.donationAlertsOnStream) {
    return NextResponse.json({ alerts: [] });
  }

  const requested = since ? new Date(since) : new Date(Date.now() - 10 * 60_000);
  if (Number.isNaN(requested.getTime())) {
    return NextResponse.json({ error: "since 형식이 올바르지 않습니다." }, { status: 400 });
  }
  // Never reach behind the channel itself, whatever the caller asks for.
  const sinceDate = new Date(Math.max(requested.getTime(), channel.createdAt.getTime()));

  const [tips, cheers, chats] = await Promise.all([
    db.tip.findMany({
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
    db.liveChatMessage.findMany({
      where: {
        channelId,
        createdAt: { gt: sinceDate },
      },
      orderBy: { createdAt: "asc" },
      take: 30,
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: { select: { username: true } },
      },
    }),
  ]);

  const alerts: OverlayAlertItem[] = [
    ...tips.map((t) => ({
      id: t.id,
      kind: "tip" as const,
      username: t.sender.username,
      amount: t.amount,
      message: t.message,
      at: t.createdAt.toISOString(),
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
    ...chats
      .filter((m) => m.content.trim().length > 0 && m.content.trim().length <= 120)
      .map((m) => ({
        id: `chat-${m.id}`,
        kind: "chat" as const,
        username: m.user.username,
        amount: 0,
        message: m.content.trim(),
        at: m.createdAt.toISOString(),
      })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  return NextResponse.json({ alerts: alerts.slice(-24) });
}
