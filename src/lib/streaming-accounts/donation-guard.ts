import { db } from "@/lib/db";
import { platformToLiveExternal } from "./types";
import { verifyYoutubeVideoBelongsToChannel } from "./providers/youtube";
import { getAccountTokens } from "./service";

export type DonationGuardResult = { ok: true } | { ok: false; error: string };

/**
 * 라이브 후원·영상 후원 전 검증:
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
    return { ok: false, error: "방송을 찾을 수 없습니다." };
  }

  if (channel.mediaSourceType === "FIRST_PARTY") {
    if (channel.isLive && channel.liveStatus === "LIVE") {
      return { ok: true };
    }
    return { ok: false, error: "진행 중인 라이브에서만 후원할 수 있습니다." };
  }

  if (!channel.connectedStreamingAccountId) {
    return {
      ok: false,
      error:
        "이 방송은 인증된 스트리밍 계정과 연결되지 않아 후원을 받을 수 없습니다.",
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
    return { ok: false, error: "연결된 스트리밍 계정을 찾을 수 없습니다." };
  }

  if (account.userId !== channel.createdBy) {
    return { ok: false, error: "방송 호스트와 스트리밍 계정 소유자가 일치하지 않습니다." };
  }

  if (!account.verified || account.revokedAt) {
    await logDonationBlocked(account.id, channelId, "Account not verified or revoked");
    return {
      ok: false,
      error: "스트리밍 계정 인증이 만료되었거나 해제되어 후원을 받을 수 없습니다.",
    };
  }

  const liveProvider = channel.externalProvider
    ? platformToLiveExternal(account.platform)
    : null;
  if (liveProvider && channel.externalProvider !== liveProvider) {
    return { ok: false, error: "방송 플랫폼과 인증 계정이 일치하지 않습니다." };
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
        error: "방송 채널이 인증된 Twitch 계정과 일치하지 않습니다.",
        detail: `externalId=${ext} account=${acc}`,
      };
    }
    return { ok: true };
  }

  if (platform === "CHZZK") {
    if (channel.externalId !== account.channelId) {
      return {
        ok: false,
        error: "방송 채널이 인증된 치지직 계정과 일치하지 않습니다.",
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
      error: "방송이 인증된 YouTube 채널과 일치하지 않습니다.",
      detail: `video=${channel.externalId} channel=${account.channelId}`,
    };
  }

  return {
    ok: false,
    error: "이 플랫폼의 외부 방송 후원은 아직 지원하지 않습니다.",
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
