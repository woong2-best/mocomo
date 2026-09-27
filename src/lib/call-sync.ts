import { CallStatus, CallType } from "@prisma/client";
import { db } from "@/lib/db";

const ACTIVE: CallStatus[] = [CallStatus.RINGING, CallStatus.ACTIVE];
const TERMINAL: CallStatus[] = [
  CallStatus.ENDED,
  CallStatus.DECLINED,
  CallStatus.CANCELLED,
  CallStatus.MISSED,
];

export type CallSyncUser = {
  id: string;
  username: string;
  image: string | null;
};

export type CallSyncCall = {
  id: string;
  signalingRoomId: string;
  chatRoomId: string | null;
  callType: CallType;
  status: CallStatus;
  caller: CallSyncUser;
  callee: CallSyncUser;
};

export type CallSyncResponse =
  | { event: null }
  | { event: "declined" | "ended"; callId: string }
  | {
      event: "incoming" | "outgoing" | "active";
      call: CallSyncCall;
      peer: CallSyncUser;
    };

function serializeCall(call: CallSyncCall): CallSyncCall {
  return {
    id: call.id,
    signalingRoomId: call.signalingRoomId,
    chatRoomId: call.chatRoomId,
    callType: call.callType,
    status: call.status,
    caller: call.caller,
    callee: call.callee,
  };
}

/** Drop this user's leftover ringing/active rows so the next call can start. */
export async function releaseCallerActiveCalls(userId: string): Promise<void> {
  await db.voiceCall.updateMany({
    where: {
      status: { in: ACTIVE },
      OR: [{ callerId: userId }, { calleeId: userId }],
    },
    data: { status: CallStatus.ENDED, endedAt: new Date() },
  });
}

/** True when the peer is already in a call with somebody else. */
export async function peerBusyWithSomeoneElse(userId: string, peerId: string): Promise<boolean> {
  const row = await db.voiceCall.findFirst({
    where: {
      status: { in: ACTIVE },
      AND: [
        { OR: [{ callerId: peerId }, { calleeId: peerId }] },
        { NOT: { OR: [{ callerId: userId }, { calleeId: userId }] } },
      ],
    },
    select: { id: true },
  });
  return !!row;
}

/** Authoritative 1:1 call state. Clients use this after a Realtime hint. */
export async function getCallSyncForUser(userId: string): Promise<CallSyncResponse> {
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
    return {
      event,
      call: serializeCall(active),
      peer,
    };
  }

  const recent = calls.find((c) => TERMINAL.includes(c.status));
  if (!recent) return { event: null };

  if (recent.status === CallStatus.DECLINED || recent.status === CallStatus.CANCELLED) {
    return { event: "declined", callId: recent.id };
  }

  return { event: "ended", callId: recent.id };
}
