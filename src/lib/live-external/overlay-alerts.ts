import { db } from "@/lib/db";

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

export async function listOverlayAlerts(
  channelId: string,
  since: string | null
): Promise<{ ok: true; alerts: OverlayAlertItem[] } | { ok: false; error: string; status: number }> {
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { createdBy: true, createdAt: true, donationAlertsOnStream: true },
  });
  if (!channel) return { ok: false, error: "Not found.", status: 404 };
  if (!channel.donationAlertsOnStream) return { ok: true, alerts: [] };

  const requested = since ? new Date(since) : new Date(Date.now() - 10 * 60_000);
  if (Number.isNaN(requested.getTime())) {
    return { ok: false, error: "Invalid since format.", status: 400 };
  }
  const sinceDate = new Date(Math.max(requested.getTime(), channel.createdAt.getTime()));

  const [tips, cheers, chats] = await Promise.all([
    db.tip.findMany({
      where: { receiverId: channel.createdBy, channelId, createdAt: { gt: sinceDate } },
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
      where: { channelId, createdAt: { gt: sinceDate } },
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
    ...tips.map((tip) => ({
      id: tip.id,
      kind: "tip" as const,
      username: tip.sender.username,
      amount: tip.amount,
      message: tip.message,
      at: tip.createdAt.toISOString(),
    })),
    ...cheers.map((cheer) => ({
      id: cheer.id,
      kind: "cheer" as const,
      username: cheer.sender.username,
      amount: cheer.amount,
      message: cheer.message,
      at: cheer.createdAt.toISOString(),
      eventType: cheer.type,
      rouletteLabel:
        typeof (cheer.metadata as { rouletteLabel?: string } | null)?.rouletteLabel === "string"
          ? (cheer.metadata as { rouletteLabel: string }).rouletteLabel
          : undefined,
    })),
    ...chats
      .filter((row) => row.content.trim().length > 0 && row.content.trim().length <= 120)
      .map((row) => ({
        id: `chat-${row.id}`,
        kind: "chat" as const,
        username: row.user.username,
        amount: 0,
        message: row.content.trim(),
        at: row.createdAt.toISOString(),
      })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  return { ok: true, alerts: alerts.slice(-24) };
}
