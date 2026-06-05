import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userPublicSelectMinimal } from "@/lib/user-public-select";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomId } = await params;
  if (!roomId || roomId.length > 64) {
    return NextResponse.json({ error: "Invalid room" }, { status: 400 });
  }

  const member = await db.chatMember.findUnique({
    where: { roomId_userId: { roomId, userId: session.user.id } },
    select: { userId: true },
  });
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const after = req.nextUrl.searchParams.get("after")?.trim();
  const afterDate = after ? new Date(after) : null;
  if (after && (!afterDate || Number.isNaN(afterDate.getTime()))) {
    return NextResponse.json({ error: "Invalid after" }, { status: 400 });
  }

  const messages = await db.message.findMany({
    where: {
      roomId,
      ...(afterDate ? { createdAt: { gt: afterDate } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 50,
    include: {
      sender: { select: userPublicSelectMinimal },
      attachments: true,
    },
  });

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
      sender: m.sender,
      attachments: m.attachments.map((a) => ({
        id: a.id,
        url: a.url,
        type: a.type,
        name: a.name,
      })),
    })),
  });
}
