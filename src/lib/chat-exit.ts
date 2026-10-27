import type { ChatRoomType, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/** 1:1 threads that support Instagram-style Exit Chat. Groups stay as-is. */
export const EXITABLE_CHAT_TYPES: ChatRoomType[] = ["DM", "MARKET"];

type DbClient = Prisma.TransactionClient | typeof db;

export function isExitableChatType(type: ChatRoomType | string): boolean {
  return EXITABLE_CHAT_TYPES.includes(type as ChatRoomType);
}

/** Hide this room from the actor's inbox. Does not delete messages or notify peers. */
export async function exitChatForUser(userId: string, roomId: string) {
  const member = await db.chatMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
    select: {
      isActive: true,
      room: { select: { type: true } },
    },
  });
  if (!member) return { error: "NOT_MEMBER" as const };
  if (!isExitableChatType(member.room.type)) return { error: "NOT_ALLOWED" as const };
  if (!member.isActive) return { ok: true as const };

  await db.chatMember.update({
    where: { roomId_userId: { roomId, userId } },
    data: { isActive: false, leftAt: new Date() },
  });
  return { ok: true as const };
}

/** Bring every hidden member back so a new message revives the thread for them. */
export async function reactivateChatMembers(roomId: string, client: DbClient = db) {
  await client.chatMember.updateMany({
    where: { roomId, isActive: false },
    data: { isActive: true },
  });
}

/** Re-open the thread for one user (e.g. they tap Message on a profile after leaving). */
export async function reactivateChatMember(
  roomId: string,
  userId: string,
  client: DbClient = db
) {
  await client.chatMember.updateMany({
    where: { roomId, userId, isActive: false },
    data: { isActive: true },
  });
}
