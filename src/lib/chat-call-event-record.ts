import { CallStatus, CallType } from "@prisma/client";
import { db } from "@/lib/db";
import {
  buildCallEventMessageBody,
  callEventMarker,
  type CallEventKind,
} from "@/lib/chat-call-event";
import { chatMessageInclude, serializeChatMessageForRelay } from "@/lib/chat-message-serialize";
import { relayChatMessageToSocket } from "@/lib/chat-socket-relay";

/** After a connected call ends, write English start/end cards into the DM. Idempotent. */
export async function recordCallChatEvents(opts: {
  callId: string;
  endedByUserId: string;
}): Promise<void> {
  const call = await db.voiceCall.findUnique({
    where: { id: opts.callId },
    select: {
      id: true,
      chatRoomId: true,
      callType: true,
      status: true,
      callerId: true,
      calleeId: true,
      startedAt: true,
      endedAt: true,
    },
  });
  if (!call?.chatRoomId) return;
  if (call.status !== CallStatus.ENDED) return;
  if (!call.startedAt) return;

  const chatRoomId = call.chatRoomId;
  const kind: CallEventKind = call.callType === CallType.VIDEO ? "VIDEO" : "AUDIO";
  const startedMarker = callEventMarker("started", kind, call.id);
  const endedMarker = callEventMarker("ended", kind, call.id);

  const startedAt = call.startedAt;
  const endedAt = call.endedAt ?? new Date();
  const endedBy =
    opts.endedByUserId === call.callerId || opts.endedByUserId === call.calleeId
      ? opts.endedByUserId
      : call.callerId;

  const created = await db.$transaction(async (tx) => {
    const existing = await tx.message.findMany({
      where: {
        roomId: chatRoomId,
        OR: [
          { content: { startsWith: startedMarker } },
          { content: { startsWith: endedMarker } },
        ],
      },
      select: { content: true },
    });
    const hasStarted = existing.some((row) => row.content?.startsWith(startedMarker));
    const hasEnded = existing.some((row) => row.content?.startsWith(endedMarker));
    if (hasStarted && hasEnded) return [];

    const rows = [];
    if (!hasStarted) {
      rows.push(
        await tx.message.create({
          data: {
            roomId: chatRoomId,
            senderId: call.callerId,
            content: buildCallEventMessageBody("started", kind, call.id),
            createdAt: startedAt,
          },
          include: chatMessageInclude,
        })
      );
    }
    if (!hasEnded) {
      rows.push(
        await tx.message.create({
          data: {
            roomId: chatRoomId,
            senderId: endedBy,
            content: buildCallEventMessageBody("ended", kind, call.id),
            createdAt: endedAt,
          },
          include: chatMessageInclude,
        })
      );
    }
    await tx.chatRoom.update({
      where: { id: chatRoomId },
      data: { updatedAt: endedAt },
    });
    return rows;
  });

  for (const message of created) {
    void relayChatMessageToSocket(chatRoomId, serializeChatMessageForRelay(message));
  }
}
