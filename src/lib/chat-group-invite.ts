import { db } from "@/lib/db";
import { isServiceBanned } from "@/lib/account-status";
import { normalizeUsername } from "@/lib/username-policy";
import { chatMessageInclude, serializeChatMessageForRelay } from "@/lib/chat-message-serialize";
import { notifyChatMessage } from "@/lib/notifications";
import { relayChatMessageToSocket } from "@/lib/chat-socket-relay";

export const MAX_GROUP_CHAT_MEMBERS = 50;

export type ChatMemberPreview = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
};

export type AddChatMemberResult =
  | { error: "NOT_MEMBER" }
  | { error: string }
  | {
      ok: true;
      roomType: "GROUP";
      added: ChatMemberPreview;
    };

function inviteNotice(username: string) {
  return `@${username} 님을 대화에 추가했습니다.`;
}

async function findInviteeByHandle(handle: string) {
  const username = normalizeUsername(handle);
  const byUsername = await db.user.findFirst({
    where: {
      deletedAt: null,
      username: { equals: username, mode: "insensitive" },
    },
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      isBanned: true,
      accountStatus: true,
    },
  });
  if (byUsername) return byUsername;

  return db.user.findFirst({
    where: { id: handle, deletedAt: null },
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      isBanned: true,
      accountStatus: true,
    },
  });
}

/** Add one user by username (or UID) to a DM/GROUP room. First extra person converts DM → GROUP in place. */
export async function addChatMemberByUsername(
  actorId: string,
  roomId: string,
  rawHandle: string
): Promise<AddChatMemberResult> {
  const handle = rawHandle.trim().replace(/^@+/, "").slice(0, 64);
  if (!handle) return { error: "아이디를 입력해 주세요." };

  const room = await db.chatRoom.findUnique({
    where: { id: roomId },
    select: {
      id: true,
      type: true,
      communityId: true,
      voiceChannelId: true,
      _count: { select: { members: true } },
    },
  });
  if (!room) return { error: "대화방을 찾을 수 없습니다." };
  if (room.type !== "DM" && room.type !== "GROUP") {
    return { error: "이 대화에는 사람을 추가할 수 없습니다." };
  }
  if (room.communityId || room.voiceChannelId) {
    return { error: "이 대화에는 사람을 추가할 수 없습니다." };
  }

  const actorMember = await db.chatMember.findUnique({
    where: { roomId_userId: { roomId, userId: actorId } },
    select: { userId: true },
  });
  if (!actorMember) return { error: "NOT_MEMBER" };

  if (room._count.members >= MAX_GROUP_CHAT_MEMBERS) {
    return { error: `단체 대화는 최대 ${MAX_GROUP_CHAT_MEMBERS}명까지입니다.` };
  }

  const target = await findInviteeByHandle(handle);
  if (!target || isServiceBanned(target)) {
    return { error: "해당 아이디의 사용자를 찾을 수 없습니다." };
  }
  if (target.id === actorId) {
    return { error: "자기 자신은 추가할 수 없습니다." };
  }

  const already = await db.chatMember.findUnique({
    where: { roomId_userId: { roomId, userId: target.id } },
    select: { userId: true },
  });
  if (already) return { error: "이미 대화에 있는 사용자입니다." };

  const notice = inviteNotice(target.username);

  const message = await db.$transaction(async (tx) => {
    if (room.type === "DM") {
      await tx.chatRoom.update({
        where: { id: roomId },
        data: { type: "GROUP" },
      });
    }
    await tx.chatMember.create({
      data: { roomId, userId: target.id, role: "member" },
    });
    const msg = await tx.message.create({
      data: {
        roomId,
        senderId: actorId,
        content: notice,
      },
      include: chatMessageInclude,
    });
    await tx.chatRoom.update({
      where: { id: roomId },
      data: { updatedAt: new Date() },
    });
    return msg;
  });

  void notifyChatMessage({
    roomId,
    senderId: actorId,
    content: notice,
    roomType: "GROUP",
  });
  void relayChatMessageToSocket(roomId, serializeChatMessageForRelay(message));

  return {
    ok: true,
    roomType: "GROUP",
    added: {
      id: target.id,
      username: target.username,
      name: target.name,
      image: target.image,
    },
  };
}
