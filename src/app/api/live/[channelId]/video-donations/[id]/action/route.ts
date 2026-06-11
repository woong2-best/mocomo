import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { toVideoDonationPayload } from "@/lib/video-donation";

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
  const action = body.action as "approve" | "reject" | "play" | "complete" | "skip";

  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { createdBy: true },
  });
  if (!channel || channel.createdBy !== session.user.id) {
    return NextResponse.json({ error: "호스트만 처리할 수 있습니다." }, { status: 403 });
  }

  const row = await db.liveVideoDonation.findUnique({
    where: { id },
    include: { sender: { select: { username: true } }, tip: { select: { message: true } } },
  });
  if (!row || row.channelId !== channelId) {
    return NextResponse.json({ error: "찾을 수 없습니다." }, { status: 404 });
  }

  let data: {
    status: "QUEUED" | "REJECTED" | "PLAYING" | "PLAYED";
    reviewedAt?: Date;
    playedAt?: Date;
    rejectReason?: string;
  } | null = null;

  if (action === "approve" && row.status === "PENDING_REVIEW") {
    data = { status: "QUEUED", reviewedAt: new Date() };
  } else if (action === "reject" && row.status === "PENDING_REVIEW") {
    data = {
      status: "REJECTED",
      reviewedAt: new Date(),
      rejectReason: String(body.reason ?? "호스트 거절").slice(0, 120),
    };
  } else if (action === "play" && (row.status === "QUEUED" || row.status === "PENDING_REVIEW")) {
    await db.liveVideoDonation.updateMany({
      where: { channelId, status: "PLAYING" },
      data: { status: "PLAYED", playedAt: new Date() },
    });
    data = { status: "PLAYING", playedAt: new Date(), reviewedAt: row.reviewedAt ?? new Date() };
  } else if (action === "complete" && row.status === "PLAYING") {
    data = { status: "PLAYED" };
  } else if (action === "skip" && row.status === "PLAYING") {
    data = { status: "PLAYED", playedAt: new Date() };
  } else {
    return NextResponse.json({ error: "처리할 수 없는 상태입니다." }, { status: 400 });
  }

  const updated = await db.liveVideoDonation.update({
    where: { id },
    data,
    include: { sender: { select: { username: true } }, tip: { select: { message: true } } },
  });

  return NextResponse.json({ ok: true, donation: toVideoDonationPayload(updated) });
}
