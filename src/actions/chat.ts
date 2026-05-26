"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { canAccessDm } from "@/lib/tiers";
import { ChatRoomType, SupportTierLevel } from "@prisma/client";
import { userPublicSelectMinimal } from "@/lib/user-public-select";

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
    const userTier = (support?.tier ?? "PEBBLE") as SupportTierLevel;
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
    where: { members: { some: { userId } } },
    take: 40,
    include: {
      members: { include: { user: { select: { ...userPublicSelectMinimal, name: true } } } },
      messages: { take: 1, orderBy: { createdAt: "desc" } },
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
  const user = await requireAuth();
  const member = await db.chatMember.findUnique({
    where: { roomId_userId: { roomId: data.roomId, userId: user.id } },
  });
  if (!member) throw new Error("NOT_MEMBER");

  const message = await db.message.create({
    data: {
      roomId: data.roomId,
      senderId: user.id,
      content: data.content,
      replyToId: data.replyToId,
      mentions: data.mentions ?? [],
      attachments: data.attachments
        ? { create: data.attachments.map((a) => ({ url: a.url, type: a.type, name: a.name })) }
        : undefined,
    },
    include: {
      sender: { select: userPublicSelectMinimal },
      attachments: true,
    },
  });

  await db.chatRoom.update({ where: { id: data.roomId }, data: { updatedAt: new Date() } });
  return { message };
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
