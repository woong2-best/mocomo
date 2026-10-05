import { errorText } from "@/lib/i18n/error-text";
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
    return NextResponse.json({ error: errorText(verified.error) }, { status: 401 });
  }

  const access = await assertOverlayBroadcastAccess(channelId, verified.payload);
  if (!access.ok) {
    return NextResponse.json({ error: errorText(access.error) }, { status: access.status });
  }

  const liveChannelId = access.channel.id;

  const sinceDate = since ? new Date(since) : new Date(Date.now() - 10 * 60_000);
  if (Number.isNaN(sinceDate.getTime())) {
    return NextResponse.json({ error: "Invalid since format." }, { status: 400 });
  }

  const tips = await db.tip.findMany({
    where: {
      receiverId: access.channel.createdBy,
      channelId: liveChannelId,
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
