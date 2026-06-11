import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeYoutubeUrl, toVideoDonationPayload } from "@/lib/video-donation";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string; id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { channelId, id } = await params;
  const body = await req.json().catch(() => ({}));
  const normalized = normalizeYoutubeUrl(String(body.url ?? ""));
  if (!normalized) {
    return NextResponse.json({ error: "YouTube URL만 등록할 수 있습니다." }, { status: 400 });
  }

  const row = await db.liveVideoDonation.findUnique({
    where: { id },
    include: { sender: { select: { username: true } }, tip: { select: { message: true } } },
  });

  if (!row || row.channelId !== channelId) {
    return NextResponse.json({ error: "영상 후원을 찾을 수 없습니다." }, { status: 404 });
  }
  if (row.senderId !== session.user.id) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  if (row.status !== "AWAITING_URL") {
    return NextResponse.json({ error: "이미 URL이 등록되었습니다." }, { status: 400 });
  }

  const updated = await db.liveVideoDonation.update({
    where: { id },
    data: { videoUrl: normalized, status: "PENDING_REVIEW" },
    include: { sender: { select: { username: true } }, tip: { select: { message: true } } },
  });

  return NextResponse.json({ ok: true, donation: toVideoDonationPayload(updated) });
}
