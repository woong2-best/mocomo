import type { SupportTierLevel } from "@prisma/client";
import { db } from "@/lib/db";
import { getSupportTiersToCreator } from "@/lib/creator-support";
import { getBroadcastRolesForUsers, type EffectiveBroadcastRole } from "@/lib/live-broadcast/permissions";

export type LiveChatMessageDto = {
  id: string;
  userId: string;
  username: string;
  content: string;
  at: number;
  image: string | null;
  /** Per-host donation tier. Null when this viewer never donated to the streamer. */
  supportTierSent: SupportTierLevel | null;
  broadcastRole?: EffectiveBroadcastRole;
};

export async function mapLiveChatMessagesWithRoles(
  channelId: string,
  messages: Array<{
    id: string;
    content: string;
    createdAt: Date;
    user: {
      id: string;
      username: string;
      image: string | null;
      supportTierSent?: SupportTierLevel | null;
    };
  }>
): Promise<LiveChatMessageDto[]> {
  const userIds = messages.map((m) => m.user.id);
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { createdBy: true },
  });
  const [roleMap, supportMap] = await Promise.all([
    getBroadcastRolesForUsers(channelId, userIds),
    getSupportTiersToCreator(channel?.createdBy ?? "", userIds),
  ]);

  return messages.map((m) => ({
    id: m.id,
    userId: m.user.id,
    username: m.user.username,
    content: m.content,
    at: m.createdAt.getTime(),
    image: m.user.image,
    supportTierSent: supportMap.get(m.user.id) ?? null,
    broadcastRole: roleMap.get(m.user.id),
  }));
}

export async function mapSingleLiveChatMessage(
  channelId: string,
  msg: {
    id: string;
    content: string;
    createdAt: Date;
    user: {
      id: string;
      username: string;
      image: string | null;
      supportTierSent: SupportTierLevel;
    };
  }
): Promise<LiveChatMessageDto> {
  const [mapped] = await mapLiveChatMessagesWithRoles(channelId, [msg]);
  return mapped!;
}
