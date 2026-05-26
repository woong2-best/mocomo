import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
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
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const includeUsers = {
    caller: { select: { id: true, username: true, image: true } },
    callee: { select: { id: true, username: true, image: true } },
  } as const;

  const active = await db.voiceCall.findFirst({
    where: {
      OR: [{ callerId: userId }, { calleeId: userId }],
      status: { in: ACTIVE },
    },
    orderBy: { updatedAt: "desc" },
    include: includeUsers,
  });

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

  const recent = await db.voiceCall.findFirst({
    where: {
      OR: [{ callerId: userId }, { calleeId: userId }],
      status: { in: TERMINAL },
      updatedAt: { gte: new Date(Date.now() - 15000) },
    },
    orderBy: { updatedAt: "desc" },
    include: includeUsers,
  });

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
