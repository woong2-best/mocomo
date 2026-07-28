import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import { liveViewerCutoff } from "@/lib/live-presence";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(_req, "mobile-live-detail", 60);
  if (limited) return limited;

  const { id } = await params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const channel = await db.voiceChannel.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      createdBy: true,
      isLive: true,
      category: true,
      thumbnailUrl: true,
      broadcastMode: true,
      members: {
        where: { lastSeenAt: { gte: liveViewerCutoff() } },
        select: { id: true },
      },
    },
  });

  if (!channel) {
    return NextResponse.json({ error: "라이브를 찾을 수 없습니다." }, { status: 404 });
  }

  const host = await db.user.findUnique({
    where: { id: channel.createdBy },
    select: { id: true, username: true, image: true },
  });

  return NextResponse.json({
    item: {
      id: channel.id,
      title: channel.name,
      thumbnailUrl: channel.thumbnailUrl,
      viewerCount: channel.members.length,
      category: channel.category,
      broadcastMode: channel.broadcastMode ?? null,
      isLive: channel.isLive,
      host: host ?? { id: channel.createdBy, username: "host", image: null },
    },
  });
}
