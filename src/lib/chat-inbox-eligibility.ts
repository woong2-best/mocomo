import type { ChatRoomType, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/** Private messaging inbox — DM (+ group rooms on web). Not community/live channels. */
export const WEB_MESSAGES_INBOX_TYPES: ChatRoomType[] = ["DM", "COSPLAYER_GROUP", "SOCIAL_GROUP"];
export const MOBILE_MESSAGES_INBOX_TYPES: ChatRoomType[] = ["DM"];

let communityLinkedRoomIdsCache: { ids: string[]; expiresAt: number } | null = null;
const COMMUNITY_ROOM_IDS_TTL_MS = 60_000;

/** CommunityChannel.chatRoomId values — FK is on CommunityChannel, so Prisma `communityChannel: { is: null }` on ChatRoom is unreliable. */
export async function getCommunityLinkedChatRoomIds(): Promise<string[]> {
  const now = Date.now();
  if (communityLinkedRoomIdsCache && communityLinkedRoomIdsCache.expiresAt > now) {
    return communityLinkedRoomIdsCache.ids;
  }
  const rows = await db.communityChannel.findMany({
    where: { chatRoomId: { not: null } },
    select: { chatRoomId: true },
  });
  const ids = rows.map((r) => r.chatRoomId!).filter(Boolean);
  communityLinkedRoomIdsCache = { ids, expiresAt: now + COMMUNITY_ROOM_IDS_TTL_MS };
  return ids;
}

export function buildMessagesInboxWhere(
  userId: string,
  opts?: { mobile?: boolean; excludeCommunityRoomIds?: string[] }
): Prisma.ChatRoomWhereInput {
  const types = opts?.mobile ? MOBILE_MESSAGES_INBOX_TYPES : WEB_MESSAGES_INBOX_TYPES;
  const where: Prisma.ChatRoomWhereInput = {
    members: { some: { userId } },
    type: { in: types },
    communityId: null,
    voiceChannelId: null,
  };
  const excludeIds = opts?.excludeCommunityRoomIds?.filter(Boolean) ?? [];
  if (excludeIds.length > 0) {
    where.id = { notIn: excludeIds };
  }
  return where;
}

export async function isMessagesInboxRoom(roomId: string): Promise<boolean> {
  const [room, communityLinkedIds] = await Promise.all([
    db.chatRoom.findUnique({
      where: { id: roomId },
      select: { id: true, type: true, communityId: true, voiceChannelId: true },
    }),
    getCommunityLinkedChatRoomIds(),
  ]);
  if (!room) return false;
  if (room.communityId || room.voiceChannelId) return false;
  if (communityLinkedIds.includes(room.id)) return false;
  if (room.type === "FANDOM" || room.type === "PUBLIC") return false;
  return WEB_MESSAGES_INBOX_TYPES.includes(room.type);
}
