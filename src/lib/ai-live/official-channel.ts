import { db } from "@/lib/db";
import { IDOLS, type IdolId } from "@/lib/ai-live/idols";
import { ensureAvatarAccount } from "@/lib/ai-live/avatar-accounts";
import {
  AVATAR_ACCOUNTS,
  MOCO_OFFICIAL_CHANNEL_ID,
  avatarAccountByChannelId,
} from "@/lib/ai-live/official-channel-id";

export type MocoOfficialChannel = {
  channelId: string;
  hostUserId: string;
};

/** Keeps one first-party channel LIVE so the normal MOCO donation API can pay that host. */
export async function ensureAlwaysOnChannel(channelId: string): Promise<MocoOfficialChannel> {
  const profile = avatarAccountByChannelId(channelId);
  if (!profile) throw new Error("Unknown always-on channel.");

  const hostUserId = await ensureAvatarAccount(profile);
  await db.voiceChannel.upsert({
    where: { id: profile.channelId },
    create: {
      id: profile.channelId,
      name: profile.name,
      createdBy: hostUserId,
      isLive: true,
      liveStatus: "LIVE",
      mediaSourceType: "FIRST_PARTY",
      broadcastMode: "BROWSER",
      category: "JUST_CHATTING",
      liveVisibility: "PUBLIC",
      donationAlertsOnStream: true,
      maxUsers: 5000,
      thumbnailUrl: "/live/moco-poster.png",
      endedAt: null,
    },
    update: {
      createdBy: hostUserId,
      name: profile.name,
      isLive: true,
      liveStatus: "LIVE",
      donationAlertsOnStream: true,
      endedAt: null,
    },
  });
  return { channelId: profile.channelId, hostUserId };
}

export async function ensureAllAvatarChannels(): Promise<void> {
  for (const account of AVATAR_ACCOUNTS) {
    await ensureAlwaysOnChannel(account.channelId);
  }
}

export async function ensureMocoOfficialChannel(): Promise<MocoOfficialChannel> {
  await ensureAllAvatarChannels();
  return ensureAlwaysOnChannel(MOCO_OFFICIAL_CHANNEL_ID);
}

/** Opening any idol room prepares all four, so a tab change still has a payable channel. */
export async function ensureIdolChannels(): Promise<Partial<Record<IdolId, string>>> {
  await ensureAllAvatarChannels();
  const channels: Partial<Record<IdolId, string>> = {};
  for (const idol of IDOLS) {
    channels[idol.id] = idol.channelId;
  }
  return channels;
}
