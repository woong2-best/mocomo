import { db } from "@/lib/db";
import { canAccessDm } from "@/lib/tiers";
import { SupportTierLevel } from "@prisma/client";
import { userPublicSelectMinimal } from "@/lib/user-public-select";
import { chatMessageInclude, serializeChatMessage, serializeChatMessages, serializeChatMessageForRelay } from "@/lib/chat-message-serialize";
import { sanitizeChatAttachments } from "@/lib/chat-attachments";
import { notifyChatMessage } from "@/lib/notifications";
import { relayChatMessageToSocket } from "@/lib/chat-socket-relay";
import { getConversationMeta } from "@/lib/chat-display";
import { filterDmMessageContent } from "@/lib/chat-content-filter";
import {
  collectPaidAttachmentIds,
  getPurchasedMessageAttachmentIds,
} from "@/lib/message-paid-media";

async function assertRoomMember(roomId: string, userId: string) {
  const member = await db.chatMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
    select: { userId: true },
  });
  return !!member;
}

/** DM always; FANDOM when community member (upserts chatMember). */
async function assertMobileChatAccess(roomId: string, userId: string) {
  const room = await db.chatRoom.findUnique({
    where: { id: roomId },
    select: { id: true, type: true, communityId: true, name: true },
  });
  if (!room) return { error: "NOT_FOUND" as const };

  if (room.type === "DM") {
    if (!(await assertRoomMember(roomId, userId))) {
      return { error: "FORBIDDEN" as const };
    }
    return { room };
  }

  if (room.type === "FANDOM") {
    if (!room.communityId) return { error: "NOT_FOUND" as const };
    const communityMember = await db.communityMember.findUnique({
      where: {
        communityId_userId: { communityId: room.communityId, userId },
      },
      select: { id: true },
    });
    if (!communityMember) return { error: "FORBIDDEN" as const };

    await db.chatMember.upsert({
      where: { roomId_userId: { roomId, userId } },
      create: { roomId, userId, role: "member" },
      update: {},
    });
    return { room };
  }

  return { error: "NOT_FOUND" as const };
}

export async function listMobileDmInbox(userId: string) {
  const rooms = await db.chatRoom.findMany({
    where: {
      type: "DM",
      communityId: null,
      members: { some: { userId } },
    },
    take: 40,
    include: {
      members: {
        take: 4,
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

  return rooms.map((room) => {
    const meta = getConversationMeta(room, userId);
    return {
      id: room.id,
      type: room.type,
      displayName: meta.displayName,
      displayImage: meta.displayImage,
      otherUserId: meta.otherUserId ?? null,
      profileUsername: meta.profileUsername ?? null,
      lastMessage: meta.lastMessage,
      lastMessageAt: meta.lastMessageAt ? meta.lastMessageAt.toISOString() : null,
    };
  });
}

export async function getOrCreateDmForUser(actorId: string, otherUserId: string) {
  if (actorId === otherUserId) {
    return { error: "자기 자신과는 DM할 수 없습니다." as const };
  }

  const other = await db.user.findUnique({
    where: { id: otherUserId },
    select: { id: true, deletedAt: true },
  });
  if (!other || other.deletedAt) {
    return { error: "사용자를 찾을 수 없습니다." as const };
  }

  const cosplayer = await db.cosplayerProfile.findUnique({
    where: { userId: otherUserId },
    select: { dmEnabled: true, minChatTier: true },
  });

  if (cosplayer?.dmEnabled) {
    const support = await db.creatorSupport.findUnique({
      where: {
        supporterId_creatorId: { supporterId: actorId, creatorId: otherUserId },
      },
    });
    const userTier = (support?.tier ?? "SEED") as SupportTierLevel;
    if (!canAccessDm(userTier, cosplayer.minChatTier)) {
      return {
        error: `DM은 ${cosplayer.minChatTier} 등급 이상 후원 시 이용 가능합니다.` as const,
        requiredTier: cosplayer.minChatTier,
      };
    }
  }

  const existing = await db.chatRoom.findFirst({
    where: {
      type: "DM",
      members: { every: { userId: { in: [actorId, otherUserId] } } },
      AND: [
        { members: { some: { userId: actorId } } },
        { members: { some: { userId: otherUserId } } },
      ],
    },
    select: { id: true },
  });
  if (existing) return { roomId: existing.id };

  const room = await db.chatRoom.create({
    data: {
      type: "DM",
      members: {
        create: [
          { userId: actorId, role: "owner" },
          { userId: otherUserId, role: "member" },
        ],
      },
    },
    select: { id: true },
  });
  return { roomId: room.id };
}

export async function getMobileRoomMessages(
  userId: string,
  roomId: string,
  opts?: { before?: string | null; after?: string | null; limit?: number }
) {
  const access = await assertMobileChatAccess(roomId, userId);
  if ("error" in access) return { error: access.error };

  const limit = Math.min(Math.max(opts?.limit ?? 40, 1), 80);
  const before = opts?.before ? new Date(opts.before) : null;
  const after = opts?.after ? new Date(opts.after) : null;
  if (opts?.before && (!before || Number.isNaN(before.getTime()))) {
    return { error: "INVALID_BEFORE" as const };
  }
  if (opts?.after && (!after || Number.isNaN(after.getTime()))) {
    return { error: "INVALID_AFTER" as const };
  }

  const room = await db.chatRoom.findUnique({
    where: { id: roomId },
    include: {
      members: {
        include: { user: { select: { ...userPublicSelectMinimal, name: true } } },
      },
    },
  });
  if (!room) {
    return { error: "NOT_FOUND" as const };
  }

  const meta = getConversationMeta(
    {
      id: room.id,
      type: room.type,
      name: room.name,
      members: room.members,
      messages: [],
    },
    userId
  );

  const rows = await db.message.findMany({
    where: {
      roomId,
      ...(before ? { createdAt: { lt: before } } : {}),
      ...(after ? { createdAt: { gt: after } } : {}),
    },
    orderBy: { createdAt: after ? "asc" : "desc" },
    take: limit,
    include: chatMessageInclude,
  });

  const chronological = after ? rows : [...rows].reverse();
  const paidIds = collectPaidAttachmentIds(chronological);
  const purchasedIds = await getPurchasedMessageAttachmentIds(userId, paidIds);
  const messages = serializeChatMessages(chronological, userId, purchasedIds);
  const nextBefore =
    !after && rows.length === limit ? rows[rows.length - 1]?.createdAt.toISOString() ?? null : null;

  return {
    room: {
      id: room.id,
      type: room.type,
      displayName: meta.displayName,
      displayImage: meta.displayImage,
      otherUserId: meta.otherUserId ?? null,
      profileUsername: meta.profileUsername ?? null,
    },
    messages,
    nextBefore,
  };
}

export async function sendMobileDmMessage(
  userId: string,
  data: {
    roomId: string;
    content?: string;
    replyToId?: string;
    attachments?: {
      url: string;
      type: "IMAGE" | "VIDEO" | "AUDIO" | "GIF" | "STICKER" | "FILE";
      name?: string;
      priceKrw?: number;
    }[];
  }
) {
  const access = await assertMobileChatAccess(data.roomId, userId);
  if ("error" in access) {
    return {
      error:
        access.error === "FORBIDDEN" ? ("NOT_MEMBER" as const) : ("ROOM_NOT_FOUND" as const),
    };
  }

  const room = access.room;

  const rawAttachmentCount = Array.isArray(data.attachments) ? data.attachments.length : 0;
  const attachments = sanitizeChatAttachments(data.attachments);
  const hasAttachments = attachments.length > 0;
  const rawText = (data.content ?? "").trim();
  const filtered = rawText ? filterDmMessageContent(rawText) : { text: "", wasFiltered: false, matchedRuleIds: [] };
  const text = filtered.text;
  if (rawAttachmentCount > 0 && !hasAttachments) {
    return { error: "ATTACHMENT_INVALID" as const };
  }
  if (!text && !hasAttachments) {
    return { error: "EMPTY_MESSAGE" as const };
  }

  if (data.replyToId) {
    const parent = await db.message.findFirst({
      where: { id: data.replyToId, roomId: data.roomId },
      select: { id: true },
    });
    if (!parent) return { error: "REPLY_NOT_FOUND" as const };
  }

  const message = await db.$transaction(async (tx) => {
    const msg = await tx.message.create({
      data: {
        roomId: data.roomId,
        senderId: userId,
        content: text || null,
        replyToId: data.replyToId,
        attachments: hasAttachments
          ? {
              create: attachments.map((a) => ({
                url: a.url,
                type: a.type,
                name: a.name,
                priceKrw: a.priceKrw ?? 0,
              })),
            }
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
    senderId: userId,
    content: text || null,
    roomType: room.type,
  });

  void relayChatMessageToSocket(data.roomId, serializeChatMessageForRelay(message));

  const purchasedIds = await getPurchasedMessageAttachmentIds(userId, collectPaidAttachmentIds([message]));
  return {
    message: serializeChatMessage(message, { viewerId: userId, purchasedAttachmentIds: purchasedIds }),
    contentFiltered: filtered.wasFiltered,
  };
}

export async function syncMobileRoomMessages(
  userId: string,
  roomId: string,
  afterIso?: string | null
) {
  const access = await assertMobileChatAccess(roomId, userId);
  if ("error" in access) return { error: access.error };
  const afterDate = afterIso ? new Date(afterIso) : null;
  if (afterIso && (!afterDate || Number.isNaN(afterDate.getTime()))) {
    return { error: "INVALID_AFTER" as const };
  }

  const messages = await db.message.findMany({
    where: {
      roomId,
      ...(afterDate ? { createdAt: { gt: afterDate } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 50,
    include: chatMessageInclude,
  });

  const paidIds = collectPaidAttachmentIds(messages);
  const purchasedIds = await getPurchasedMessageAttachmentIds(userId, paidIds);
  return { messages: serializeChatMessages(messages, userId, purchasedIds) };
}
