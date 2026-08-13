import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/** GET /api/tips/[id] — letter envelope payload for DM / live open UI */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "tip-letter-get", 120);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const tip = await db.tip.findUnique({
    where: { id },
    select: {
      id: true,
      amount: true,
      message: true,
      receiverId: true,
      senderId: true,
      createdAt: true,
      sender: { select: { username: true, name: true } },
    },
  });
  if (!tip) {
    return NextResponse.json({ error: "후원을 찾을 수 없습니다." }, { status: 404 });
  }

  const viewerId = session.user.id;
  if (viewerId !== tip.receiverId && viewerId !== tip.senderId) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  return NextResponse.json({
    tip: {
      id: tip.id,
      amount: tip.amount,
      message: tip.message ?? "",
      senderName: tip.sender.name || tip.sender.username,
      senderUsername: tip.sender.username,
      createdAt: tip.createdAt.toISOString(),
    },
  });
}
