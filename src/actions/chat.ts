"use server";

import { db } from "@/lib/db";
import { requireAuth, requireAuthMinimal } from "@/lib/auth";
import { canAccessDm } from "@/lib/tiers";
import { ChatRoomType, SupportTierLevel } from "@prisma/client";
import { userPublicSelectMinimal } from "@/lib/user-public-select";
import { chatMessageInclude, serializeChatMessage } from "@/lib/chat-message-serialize";
import { sanitizeChatAttachments } from "@/lib/chat-attachments";
import { notifyChatMessage } from "@/lib/notifications";
import { relayChatMessageToSocket } from "@/lib/chat-socket-relay";
import { loadMemberPermissions } from "@/lib/community-server/member-permissions";
import { hasPermission } from "@/lib/community-server/permissions";

export async function createChatRoom(data: {
  name?: string;
  type: ChatRoomType;
  communityId?: string;
  memberIds?: string[];
}) {
  const user = await requireAuth();
  const room = await db.chatRoom.create({
    data: {
      name: data.name,
      type: data.type,
      communityId: data.communityId,
      isPublic: data.type === "PUBLIC" || data.type === "FANDOM",
      members: {
        create: [
          { userId: user.id, role: "owner" },
          ...(data.memberIds?.map((id) => ({ userId: id, role: "member" })) ?? []),
        ],
      },
    },
    include: { members: { include: { user: { select: userPublicSelectMinimal } } } },
  });
  return { room };
}

export async function getOrCreateDM(otherUserId: string) {
  const user = await requireAuth();

  const cosplayer = await db.cosplayerProfile.findUnique({
    where: { userId: otherUserId },
    select: { dmEnabled: true, minChatTier: true },
  });

  if (cosplayer?.dmEnabled) {
    const support = await db.creatorSupport.findUnique({
      where: { supporterId_creatorId: { supporterId: user.id, creatorId: otherUserId } },
    });
    const userTier = (support?.tier ?? "SEED") as SupportTierLevel;
    if (!canAccessDm(userTier, cosplayer.minChatTier)) {
      return {
        error: `DM은 ${cosplayer.minChatTier} 등급 이상 후원 시 이용 가능합니다.`,
        requiredTier: cosplayer.minChatTier,
      };
    }
  }

  const existing = await db.chatRoom.findFirst({
    where: {
      type: "DM",
      members: { every: { userId: { in: [user.id, otherUserId] } } },
      AND: [
        { members: { some: { userId: user.id } } },
        { members: { some: { userId: otherUserId } } },
      ],
    },
    include: {
      members: { include: { user: { select: { ...userPublicSelectMinimal, name: true } } } },
      messages: { take: 50, orderBy: { createdAt: "desc" }, include: { sender: true, attachments: true } },
    },
  });
  if (existing) return { room: existing };
  return createChatRoom({ type: "DM", memberIds: [otherUserId] });
}

export async function getChatRooms(forUserId?: string) {
  let userId = forUserId;
  if (!userId) {
    const user = await requireAuth();
    userId = user.id;
  }
  const rooms = await db.chatRoom.findMany({
    where: {
      members: { some: { userId } },
      // 커뮤니티 서버 채널 — /messages 인박스와 분리 (/c/... 에서만 이용)
      communityId: null,
      communityChannel: { is: null },
    },
    take: 25,
    include: {
      members: {
        take: 6,
        include: { user: { select: { ...userPublicSelectMinimal, name: true } } },
      },
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: {
          content: true,
          createdAt: true,
          attachments: { select: { type: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
  return rooms;
}

export async function sendMessage(data: {
  roomId: string;
  content?: string;
  replyToId?: string;
  mentions?: string[];
  attachments?: { url: string; type: "IMAGE" | "VIDEO" | "AUDIO" | "GIF" | "STICKER" | "FILE"; name?: string }[];
}) {
  const user = await requireAuth({ writeKind: "dm" });
  const member = await db.chatMember.findUnique({
    where: { roomId_userId: { roomId: data.roomId, userId: user.id } },
    select: { userId: true },
  });
  if (!member) throw new Error("NOT_MEMBER");

  const rawAttachmentCount = Array.isArray(data.attachments) ? data.attachments.length : 0;
  const attachments = sanitizeChatAttachments(data.attachments);
  const hasAttachments = attachments.length > 0;
  const text = (data.content ?? "").trim();
  if (rawAttachmentCount > 0 && !hasAttachments) {
    throw new Error("ATTACHMENT_INVALID");
  }
  if (!text && !hasAttachments) throw new Error("EMPTY_MESSAGE");

  const room = await db.chatRoom.findUnique({
    where: { id: data.roomId },
    select: { type: true, communityId: true },
  });
  if (!room) throw new Error("ROOM_NOT_FOUND");

  const communityChannel = await db.communityChannel.findFirst({
    where: { chatRoomId: data.roomId },
    select: { slowModeSec: true, isLocked: true, communityId: true },
  });
  if (communityChannel) {
    if (communityChannel.isLocked) {
      const perms = await loadMemberPermissions(communityChannel.communityId, user.id, false);
      if (!hasPermission(perms, "moderateChat") && !hasPermission(perms, "manageChannels")) {
        throw new Error("CHANNEL_LOCKED");
      }
    }
    if (communityChannel.slowModeSec > 0) {
      const last = await db.message.findFirst({
        where: { roomId: data.roomId, senderId: user.id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });
      if (last) {
        const elapsed = (Date.now() - last.createdAt.getTime()) / 1000;
        if (elapsed < communityChannel.slowModeSec) {
          throw new Error(`SLOW_MODE:${Math.ceil(communityChannel.slowModeSec - elapsed)}`);
        }
      }
    }
  }

  if (data.replyToId) {
    const parent = await db.message.findFirst({
      where: { id: data.replyToId, roomId: data.roomId },
      select: { id: true },
    });
    if (!parent) throw new Error("REPLY_NOT_FOUND");
  }

  const message = await db.$transaction(async (tx) => {
    const msg = await tx.message.create({
      data: {
        roomId: data.roomId,
        senderId: user.id,
        content: text || null,
        replyToId: data.replyToId,
        mentions: data.mentions ?? [],
        attachments: hasAttachments
          ? { create: attachments.map((a) => ({ url: a.url, type: a.type, name: a.name })) }
          : undefined,
      },
      include: chatMessageInclude,
    });
    await tx.chatRoom.update({
      where: { id: data.roomId },
      data: { updatedAt: new Date() },
    });
    return msg;
  });

  void notifyChatMessage({
    roomId: data.roomId,
    senderId: user.id,
    content: text || null,
    roomType: room.type,
    mentionUserIds: data.mentions,
  });

  void relayChatMessageToSocket(data.roomId, {
    ...message,
    createdAt: message.createdAt.toISOString(),
  });

  return { message: serializeChatMessage(message) };
}

export async function markMessageRead(messageId: string) {
  const user = await requireAuth();
  await db.messageRead.upsert({
    where: { messageId_userId: { messageId, userId: user.id } },
    create: { messageId, userId: user.id },
    update: { readAt: new Date() },
  });
  return { success: true };
}

export async function pinMessage(roomId: string, messageId: string) {
  const user = await requireAuth();
  const member = await db.chatMember.findFirst({
    where: { roomId, userId: user.id, role: { in: ["owner", "admin"] } },
  });
  if (!member) throw new Error("FORBIDDEN");
  await db.pinnedMessage.upsert({
    where: { messageId },
    create: { roomId, messageId, pinnedBy: user.id },
    update: { pinnedAt: new Date() },
  });
  return { success: true };
}
