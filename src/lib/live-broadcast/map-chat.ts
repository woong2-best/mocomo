import type { SupportTierLevel } from "@prisma/client";
import { getBroadcastRolesForUsers, type EffectiveBroadcastRole } from "@/lib/live-broadcast/permissions";

export type LiveChatMessageDto = {
  id: string;
  userId: string;
  username: string;
  content: string;
  at: number;
  image: string | null;
  supportTierSent: SupportTierLevel;
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
      supportTierSent: SupportTierLevel;
    };
  }>
): Promise<LiveChatMessageDto[]> {
  const userIds = messages.map((m) => m.user.id);
  const roleMap = await getBroadcastRolesForUsers(channelId, userIds);

  return messages.map((m) => ({
    id: m.id,
    userId: m.user.id,
    username: m.user.username,
    content: m.content,
    at: m.createdAt.getTime(),
    image: m.user.image,
    supportTierSent: m.user.supportTierSent,
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
