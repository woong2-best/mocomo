import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { extractYoutubeVideoId, type VideoDonationHistoryItem } from "@/lib/video-donation";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { channelId } = await params;

  const rows = await db.liveVideoDonation
    .findMany({
      where: {
        senderId: session.user.id,
        channelId,
        videoUrl: { not: null },
        status: { not: "REJECTED" },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        videoUrl: true,
        videoTitle: true,
        thumbnailUrl: true,
        amount: true,
        createdAt: true,
      },
    })
    .catch(() => []);

  const seen = new Set<string>();
  const items: VideoDonationHistoryItem[] = [];

  for (const row of rows) {
    if (!row.videoUrl) continue;
    const videoId = extractYoutubeVideoId(row.videoUrl);
    if (!videoId || seen.has(videoId)) continue;
    seen.add(videoId);
    items.push({
      id: row.id,
      videoUrl: row.videoUrl,
      videoId,
      videoTitle: row.videoTitle,
      thumbnailUrl: row.thumbnailUrl,
      amount: row.amount,
      at: row.createdAt.getTime(),
    });
  }

  return NextResponse.json({ ok: true, items });
}
