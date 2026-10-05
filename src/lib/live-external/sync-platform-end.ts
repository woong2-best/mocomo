import { db } from "@/lib/db";
import { releaseBroadcastSession } from "@/lib/live-broadcast/session-manager";
import { revalidateLiveHubCache } from "@/lib/live-hub-data";
import { liveRoomCacheTag } from "@/lib/cached-live-meta";
import { getAccountTokens } from "@/lib/streaming-accounts/service";
import type { LiveExternalProvider } from "./types";
import { checkExternalPlatformLiveStatus } from "./platform-live-status";
import { relayLiveEndedToSocket } from "@/lib/live-end-socket-relay";
import { revalidateTag } from "next/cache";

type ExternalChannelRow = {
  id: string;
  createdBy: string;
  isLive: boolean;
  liveStatus: string;
  externalProvider: string | null;
  externalId: string | null;
  externalChannelId?: string | null;
  connectedStreamingAccountId: string | null;
  createdAt?: Date;
};

/** YouTube/Twitch often lag behind a just-started broadcast. */
const AUTO_END_GRACE_MS = 15 * 60 * 1000;

async function resolveAccessToken(
  connectedStreamingAccountId: string | null
): Promise<string | null> {
  if (!connectedStreamingAccountId) return null;
  const account = await db.connectedStreamingAccount.findUnique({
    where: { id: connectedStreamingAccountId },
    select: {
      id: true,
      userId: true,
      platform: true,
      channelId: true,
      channelName: true,
      channelUrl: true,
      profileImage: true,
      verified: true,
      verificationMethod: true,
      verifiedAt: true,
      revokedAt: true,
      verificationCode: true,
      encryptedTokenData: true,
      encryptionIv: true,
      encryptionAuthTag: true,
      encryptionKeyId: true,
      tokenExpiresAt: true,
    },
  });
  if (!account || account.revokedAt || !account.verified) return null;
  const tokens = await getAccountTokens(account);
  return tokens?.accessToken ?? null;
}

const HOST_STUDIO_PRESENT_MS = 90_000;

async function peekPlatformOnAir(
  channel: ExternalChannelRow
): Promise<{ onAir: boolean | null; confident: boolean }> {
  if (!channel.externalProvider || !channel.externalId) {
    return { onAir: null, confident: false };
  }

  const provider = channel.externalProvider.toUpperCase() as LiveExternalProvider;
  const accessToken =
    provider === "YOUTUBE"
      ? await resolveAccessToken(channel.connectedStreamingAccountId)
      : null;

  const status = await checkExternalPlatformLiveStatus({
    provider,
    externalId: channel.externalId,
    externalChannelId: channel.externalChannelId,
    accessToken,
  });

  if (!status.confident) {
    return { onAir: null, confident: false };
  }
  return { onAir: status.onAir, confident: true };
}

/** Observe-only — never ends the MoCoMo room. Used by the in-studio poll. */
export async function peekExternalPlatformLiveStatus(
  channel: ExternalChannelRow
): Promise<{ ended: boolean; platformOnAir: boolean | null }> {
  const peek = await peekPlatformOnAir(channel);
  if (!peek.confident) {
    return { ended: false, platformOnAir: null };
  }
  return { ended: false, platformOnAir: peek.onAir };
}

async function isHostSittingInStudio(
  channelId: string,
  hostUserId: string
): Promise<boolean> {
  const cutoff = new Date(Date.now() - HOST_STUDIO_PRESENT_MS);
  const hostSeen = await db.voiceMember.findFirst({
    where: { channelId, userId: hostUserId, lastSeenAt: { gte: cutoff } },
    select: { userId: true },
  });
  return !!hostSeen;
}

export async function syncExternalPlatformLiveEnd(
  channel: ExternalChannelRow
): Promise<{ ended: boolean; platformOnAir: boolean | null }> {
  const peek = await peekPlatformOnAir(channel);
  if (!peek.confident) {
    return { ended: false, platformOnAir: null };
  }

  if (peek.onAir) {
    return { ended: false, platformOnAir: true };
  }

  const mocomoLive =
    channel.isLive && channel.liveStatus !== "ENDED";
  if (!mocomoLive) {
    return { ended: false, platformOnAir: false };
  }

  if (await isHostSittingInStudio(channel.id, channel.createdBy)) {
    return { ended: false, platformOnAir: false };
  }

  const createdAt =
    channel.createdAt ??
    (
      await db.voiceChannel.findUnique({
        where: { id: channel.id },
        select: { createdAt: true },
      })
    )?.createdAt;
  if (createdAt && Date.now() - createdAt.getTime() < AUTO_END_GRACE_MS) {
    return { ended: false, platformOnAir: false };
  }

  const ok = await releaseBroadcastSession(
    channel.id,
    channel.createdBy,
    "AUTO_PLATFORM_END"
  );
  if (ok) {
    revalidateLiveHubCache();
    revalidateTag(liveRoomCacheTag(channel.id));
    void relayLiveEndedToSocket(channel.id);
  }

  return { ended: ok, platformOnAir: false };
}

/** Cron / batch — end external MoCoMo rooms whose platform stream already finished. */
export async function autoEndExternalPlatformOffChannels(): Promise<number> {
  const channels = await db.voiceChannel.findMany({
    where: {
      isLive: true,
      liveStatus: "LIVE",
      OR: [{ broadcastMode: "EXTERNAL" }, { mediaSourceType: "EXTERNAL" }],
    },
    select: {
      id: true,
      createdBy: true,
      isLive: true,
      liveStatus: true,
      externalProvider: true,
      externalId: true,
      externalChannelId: true,
      connectedStreamingAccountId: true,
      createdAt: true,
    },
  });

  let ended = 0;
  for (const ch of channels) {
    const result = await syncExternalPlatformLiveEnd(ch);
    if (result.ended) ended += 1;
  }
  return ended;
}

/** Host-scoped — e.g. before starting a new external live. */
export async function autoEndExternalPlatformOffForHost(hostUserId: string): Promise<number> {
  const channels = await db.voiceChannel.findMany({
    where: {
      createdBy: hostUserId,
      isLive: true,
      liveStatus: "LIVE",
      OR: [{ broadcastMode: "EXTERNAL" }, { mediaSourceType: "EXTERNAL" }],
    },
    select: {
      id: true,
      createdBy: true,
      isLive: true,
      liveStatus: true,
      externalProvider: true,
      externalId: true,
      externalChannelId: true,
      connectedStreamingAccountId: true,
      createdAt: true,
    },
  });

  let ended = 0;
  for (const ch of channels) {
    const result = await syncExternalPlatformLiveEnd(ch);
    if (result.ended) ended += 1;
  }
  return ended;
}
