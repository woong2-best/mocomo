import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveLiveChannelAccess } from "@/lib/live-room-access";
import { db } from "@/lib/db";
import { toVideoDonationPayload } from "@/lib/video-donation";

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

  const rows = await db.liveVideoDonation
    .findMany({
      where: {
        channelId,
        status: { in: ["PENDING_REVIEW", "QUEUED", "PLAYING"] },
      },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      take: 20,
      include: {
        sender: { select: { username: true } },
        tip: { select: { message: true } },
      },
    })
    .catch(() => []);

  const playing = rows.find((r) => r.status === "PLAYING");
  const queue = rows.filter((r) => r.status !== "PLAYING");

  return NextResponse.json({
    ok: true,
    playing: playing ? toVideoDonationPayload(playing) : null,
    queue: queue.map(toVideoDonationPayload),
  });
}
