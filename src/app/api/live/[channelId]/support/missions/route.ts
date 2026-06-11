import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveLiveChannelAccess } from "@/lib/live-room-access";
import { db } from "@/lib/db";
import type { LiveSupportMissionPayload } from "@/lib/live-support/types";

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

  const rows = await db.liveSupportMission
    .findMany({
      where: {
        channelId,
        status: { in: ["PENDING", "ACCEPTED"] },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { sender: { select: { username: true } } },
    })
    .catch(() => []);

  const missions: LiveSupportMissionPayload[] = rows.map((r) => ({
    id: r.id,
    channelId: r.channelId,
    title: r.title,
    rewardAmount: r.rewardAmount,
    status: r.status,
    username: r.sender.username,
    senderId: r.senderId,
    deadline: r.deadline?.getTime() ?? null,
    at: r.createdAt.getTime(),
  }));

  return NextResponse.json({ ok: true, missions });
}
