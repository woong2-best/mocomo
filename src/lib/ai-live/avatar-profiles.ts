import { db } from "@/lib/db";
import {
  mergeAvatarPublicProfiles,
  type AvatarPublicProfile,
} from "@/lib/ai-live/avatar-profile-shared";
import { AVATAR_ACCOUNTS, type AvatarAccountId } from "@/lib/ai-live/official-channel-id";

export type { AvatarPublicProfile, AvatarUserRow } from "@/lib/ai-live/avatar-profile-shared";
export { mergeAvatarPublicProfiles } from "@/lib/ai-live/avatar-profile-shared";

/** Live tiles and rooms read these like any other user profile. */
export async function getAvatarPublicProfiles(): Promise<Record<AvatarAccountId, AvatarPublicProfile>> {
  const channels = await db.voiceChannel.findMany({
    where: { id: { in: AVATAR_ACCOUNTS.map((account) => account.channelId) } },
    select: { id: true, createdBy: true },
  });
  const channelOwnerIds = new Map(channels.map((channel) => [channel.id, channel.createdBy]));
  const ownerIds = [...new Set(channels.map((channel) => channel.createdBy))];

  const users = await db.user.findMany({
    where: {
      OR: [
        ...(ownerIds.length > 0 ? [{ id: { in: ownerIds } }] : []),
        { username: { in: AVATAR_ACCOUNTS.map((account) => account.username), mode: "insensitive" as const } },
      ],
    },
    select: { id: true, username: true, name: true, image: true },
  });

  return mergeAvatarPublicProfiles(AVATAR_ACCOUNTS, users, channelOwnerIds);
}
