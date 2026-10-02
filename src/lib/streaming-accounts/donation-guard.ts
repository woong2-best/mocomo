import { db } from "@/lib/db";
import { platformToLiveExternal } from "./types";
import { verifyYoutubeVideoBelongsToChannel } from "./providers/youtube";
import { getAccountTokens } from "./service";

export type DonationGuardResult = { ok: true } | { ok: false; error: string };

/**
 * 라이브 후원·Video 후원 전 검증:
 * - 외부 방송: 인증된 ConnectedStreamingAccount 필수 + 채널 ID 일치
 * - 자체 방송: LIVE 상태면 허용
 */
export async function assertLiveDonationsAllowed(
  channelId: string
): Promise<DonationGuardResult> {
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: {
      id: true,
      mediaSourceType: true,
      externalProvider: true,
      externalId: true,
      externalChannelId: true,
      connectedStreamingAccountId: true,
      isLive: true,
      liveStatus: true,
      createdBy: true,
    },
  });

  if (!channel) {
    return { ok: false, error: "Stream not found." };
  }

  if (channel.mediaSourceType === "FIRST_PARTY") {
    if (channel.isLive && channel.liveStatus === "LIVE") {
      return { ok: true };
    }
    return { ok: false, error: "Support is only available during an active live stream." };
  }

  if (!channel.connectedStreamingAccountId) {
    return {
      ok: false,
      error:
        "This stream is not linked to a verified streaming account and cannot receive support.",
    };
  }

  const account = await db.connectedStreamingAccount.findUnique({
    where: { id: channel.connectedStreamingAccountId },
    select: {
      id: true,
      userId: true,
      platform: true,
      channelId: true,
      verified: true,
      revokedAt: true,
      encryptedTokenData: true,
      encryptionIv: true,
      encryptionAuthTag: true,
      encryptionKeyId: true,
      tokenExpiresAt: true,
    },
  });

  if (!account) {
    return { ok: false, error: "Linked streaming account not found." };
  }

  if (account.userId !== channel.createdBy) {
    return { ok: false, error: "Stream host and streaming account owner do not match." };
  }

  if (!account.verified || account.revokedAt) {
    await logDonationBlocked(account.id, channelId, "Account not verified or revoked");
    return {
      ok: false,
      error: "Streaming account verification expired or was unlinked; support is unavailable.",
    };
  }

  const liveProvider = channel.externalProvider
    ? platformToLiveExternal(account.platform)
    : null;
  if (liveProvider && channel.externalProvider !== liveProvider) {
    return { ok: false, error: "Stream platform and verified account do not match." };
  }

  const channelMatch = await verifyChannelMatch(channel, account);
  if (!channelMatch.ok) {
    await logDonationBlocked(account.id, channelId, channelMatch.detail);
    return { ok: false, error: channelMatch.error };
  }

  return { ok: true };
}

async function verifyChannelMatch(
  channel: {
    externalProvider: string | null;
    externalId: string | null;
    externalChannelId: string | null;
  },
  account: { platform: string; channelId: string; id: string }
): Promise<{ ok: true } | { ok: false; error: string; detail: string }> {
  const platform = account.platform;

  if (platform === "TWITCH") {
    const ext = channel.externalId?.toLowerCase();
    const acc = account.channelId.toLowerCase();
    if (ext !== acc) {
      return {
        ok: false,
        error: "Stream channel does not match the verified Twitch account.",
        detail: `externalId=${ext} account=${acc}`,
      };
    }
    return { ok: true };
  }

  if (platform === "CHZZK") {
    if (channel.externalId !== account.channelId) {
      return {
        ok: false,
        error: "Stream channel does not match the verified CHZZK account.",
        detail: `externalId=${channel.externalId} account=${account.channelId}`,
      };
    }
    return { ok: true };
  }

  if (platform === "YOUTUBE") {
    if (channel.externalChannelId === account.channelId) {
      return { ok: true };
    }

    if (channel.externalId) {
      const row = await db.connectedStreamingAccount.findUnique({
        where: { id: account.id },
        select: {
          platform: true,
          channelId: true,
          encryptedTokenData: true,
          encryptionIv: true,
          encryptionAuthTag: true,
          encryptionKeyId: true,
          tokenExpiresAt: true,
        },
      });
      if (row) {
        const tokens = await getAccountTokens({
          ...row,
          id: account.id,
          userId: "",
          channelName: "",
          channelUrl: "",
          profileImage: null,
          verified: true,
          verificationMethod: null,
          verificationCode: null,
          verifiedAt: null,
          revokedAt: null,
        });
        const belongs = await verifyYoutubeVideoBelongsToChannel(
          channel.externalId,
          account.channelId,
          tokens?.accessToken
        );
        if (belongs) return { ok: true };
      }
    }

    return {
      ok: false,
      error: "Stream does not match the verified YouTube channel.",
      detail: `video=${channel.externalId} channel=${account.channelId}`,
    };
  }

  return {
    ok: false,
    error: "External stream support for this platform is not supported yet.",
    detail: platform,
  };
}

async function logDonationBlocked(accountId: string, channelId: string, detail?: string) {
  try {
    await db.streamingAccountVerificationLog.create({
      data: {
        accountId,
        action: "DONATION_BLOCKED",
        success: false,
        detail: detail ?? `channelId=${channelId}`,
      },
    });
  } catch {
    /* non-fatal */
  }
}

export async function isExternalLiveDonationsEnabled(channelId: string): Promise<boolean> {
  const result = await assertLiveDonationsAllowed(channelId);
  return result.ok;
}
