import { NextResponse } from "next/server";
import { getCachedAuthUserMinimal } from "@/lib/auth";
import { db } from "@/lib/db";
import { CallStatus, CallType } from "@prisma/client";

const ACTIVE: CallStatus[] = [CallStatus.RINGING, CallStatus.ACTIVE];
const TERMINAL: CallStatus[] = [
  CallStatus.ENDED,
  CallStatus.DECLINED,
  CallStatus.CANCELLED,
  CallStatus.MISSED,
];

function serializeCall(call: {
  id: string;
  livekitRoom: string;
  chatRoomId: string | null;
  callType: CallType;
  status: CallStatus;
  caller: { id: string; username: string; image: string | null };
  callee: { id: string; username: string; image: string | null };
}) {
  return {
    id: call.id,
    livekitRoom: call.livekitRoom,
    chatRoomId: call.chatRoomId,
    callType: call.callType,
    status: call.status,
    caller: call.caller,
    callee: call.callee,
  };
}

/** Socket 서버 없이도 통화 알림/상태 동기화 (Vercel 프로덕션용) */
export async function GET() {
  const user = await getCachedAuthUserMinimal();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.isBanned) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = user.id;
  const includeUsers = {
    caller: { select: { id: true, username: true, image: true } },
    callee: { select: { id: true, username: true, image: true } },
  } as const;
  const terminalSince = new Date(Date.now() - 15000);

  const calls = await db.voiceCall.findMany({
    where: {
      AND: [
        { OR: [{ callerId: userId }, { calleeId: userId }] },
        {
          OR: [
            { status: { in: ACTIVE } },
            { status: { in: TERMINAL }, updatedAt: { gte: terminalSince } },
          ],
        },
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: 4,
    include: includeUsers,
  });

  const active = calls.find((c) => ACTIVE.includes(c.status));
  if (active) {
    const isCaller = active.callerId === userId;
    const peer = isCaller ? active.callee : active.caller;
    let event: "incoming" | "outgoing" | "active" = "active";
    if (active.status === CallStatus.RINGING) {
      event = isCaller ? "outgoing" : "incoming";
    }
    return NextResponse.json({
      event,
      call: serializeCall(active),
      peer,
    });
  }

  const recent = calls.find((c) => TERMINAL.includes(c.status));
  if (!recent) {
    return NextResponse.json({ event: null });
  }

  if (recent.status === CallStatus.DECLINED || recent.status === CallStatus.CANCELLED) {
    return NextResponse.json({
      event: "declined",
      callId: recent.id,
    });
  }

  return NextResponse.json({
    event: "ended",
    callId: recent.id,
  });
}
