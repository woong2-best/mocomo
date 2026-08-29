import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { chatMessageInclude, serializeChatMessages } from "@/lib/chat-message-serialize";
import {
  collectPaidAttachmentIds,
  getPurchasedMessageAttachmentIds,
} from "@/lib/message-paid-media";

export const maxDuration = 10;

const POLL_MS = 350;
const HOLD_MS = 9500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchNewMessages(roomId: string, after: Date | null) {
  return db.message.findMany({
    where: {
      roomId,
      ...(after ? { createdAt: { gt: after } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 50,
    include: chatMessageInclude,
  });
}

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

  const afterRaw = req.nextUrl.searchParams.get("after")?.trim();
  const afterDate = afterRaw ? new Date(afterRaw) : null;
  if (afterRaw && (!afterDate || Number.isNaN(afterDate.getTime()))) {
    return NextResponse.json({ error: "Invalid after" }, { status: 400 });
  }

  const deadline = Date.now() + HOLD_MS;
  while (Date.now() < deadline) {
    const messages = await fetchNewMessages(roomId, afterDate);
    if (messages.length > 0) {
      const paidIds = collectPaidAttachmentIds(messages);
      const purchasedIds = await getPurchasedMessageAttachmentIds(session.user.id, paidIds);
      return NextResponse.json({
        messages: serializeChatMessages(messages, session.user.id, purchasedIds),
      });
    }
    await sleep(POLL_MS);
  }

  return NextResponse.json({ messages: [] });
}
