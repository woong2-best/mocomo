import { db } from "@/lib/db";

export async function recordLiveChatDeletion(channelId: string, messageId: string) {
  await db.liveChatDeletion.upsert({
    where: { channelId_messageId: { channelId, messageId } },
    create: { channelId, messageId },
    update: { deletedAt: new Date() },
  });
}

export async function listLiveChatDeletedIds(channelId: string, since?: Date | null) {
  const rows = await db.liveChatDeletion.findMany({
    where: {
      channelId,
      ...(since ? { deletedAt: { gt: since } } : {}),
    },
    select: { messageId: true },
    orderBy: { deletedAt: "asc" },
    take: 200,
  });
  return rows.map((row) => row.messageId);
}
