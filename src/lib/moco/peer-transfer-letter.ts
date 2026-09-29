import { db } from "@/lib/db";
import { buildAtmLetterContent } from "@/lib/chat-atm-letter";
import { chatMessageInclude, serializeChatMessageForRelay } from "@/lib/chat-message-serialize";
import { relayChatMessageToSocket } from "@/lib/chat-socket-relay";
import { notifyChatMessage } from "@/lib/notifications";

async function ensureDirectRoom(senderId: string, recipientId: string) {
  const existing = await db.chatRoom.findFirst({
    where: {
      type: "DM",
      AND: [
        { members: { some: { userId: senderId } } },
        { members: { some: { userId: recipientId } } },
      ],
      members: { every: { userId: { in: [senderId, recipientId] } } },
    },
    select: { id: true },
  });
  if (existing) return existing.id;

  const room = await db.chatRoom.create({
    data: {
      type: "DM",
      members: {
        create: [
          { userId: senderId, role: "owner" },
          { userId: recipientId, role: "member" },
        ],
      },
    },
    select: { id: true },
  });
  return room.id;
}

/** 전달이 끝난 뒤 상대 메시지에 봉투를 남긴다. 정산은 이미 기록된 상태다. */
export async function deliverPeerTransferLetter(input: {
  senderId: string;
  recipientId: string;
  amount: number;
  message: string;
}) {
  const roomId = await ensureDirectRoom(input.senderId, input.recipientId);
  const content = buildAtmLetterContent(input.amount, input.message);

  const message = await db.$transaction(async (tx) => {
    const row = await tx.message.create({
      data: {
        roomId,
        senderId: input.senderId,
        content,
      },
      include: chatMessageInclude,
    });
    await tx.chatRoom.update({
      where: { id: roomId },
      data: { updatedAt: new Date() },
    });
    return row;
  });

  void notifyChatMessage({
    roomId,
    senderId: input.senderId,
    content: "편지가 도착했습니다",
    roomType: "DM",
  });
  void relayChatMessageToSocket(roomId, serializeChatMessageForRelay(message));
}
