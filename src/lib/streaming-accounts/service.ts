import type { StreamingVerificationMethod } from "@prisma/client";
import { db } from "@/lib/db";
import type {
  ConnectedAccountRow,
  ConnectableStreamingPlatform,
  StreamingAccountPublic,
  StreamingTokenPayload,
} from "./types";
import { getStreamingProvider } from "./registry";
import {
  decryptStreamingTokens,
  encryptStreamingTokens,
  canStoreStreamingTokens,
} from "./vault";
import {
  generateVerificationCode,
  mintStreamingOAuthState,
  streamingOAuthRedirectUri,
  verifyStreamingOAuthState,
} from "./oauth-state";

const ACCOUNT_SELECT = {
  id: true,
  userId: true,
  platform: true,
  channelId: true,
  channelName: true,
  channelUrl: true,
  profileImage: true,
  verified: true,
  verificationMethod: true,
  verificationCode: true,
  verifiedAt: true,
  encryptedTokenData: true,
  encryptionIv: true,
  encryptionAuthTag: true,
  encryptionKeyId: true,
  tokenExpiresAt: true,
  revokedAt: true,
} as const;

export function toPublicAccount(
  row: ConnectedAccountRow & { verificationCode?: string | null }
): StreamingAccountPublic {
  return {
    id: row.id,
    platform: row.platform,
    channelId: row.channelId,
    channelName: row.channelName,
    channelUrl: row.channelUrl,
    profileImage: row.profileImage,
    verified: row.verified && !row.revokedAt,
    verificationMethod: row.verificationMethod,
    verifiedAt: row.verifiedAt,
    pendingVerification: !row.verified && !row.revokedAt && Boolean(row.verificationCode),
    verificationCode: !row.verified && !row.revokedAt ? row.verificationCode : null,
    revokedAt: row.revokedAt,
  };
}

async function logVerification(
  accountId: string,
  action: string,
  opts?: {
    method?: StreamingVerificationMethod;
    success?: boolean;
    detail?: string;
    actorId?: string;
  }
) {
  await db.streamingAccountVerificationLog.create({
    data: {
      accountId,
      action,
      method: opts?.method,
      success: opts?.success ?? true,
      detail: opts?.detail?.slice(0, 4000),
      actorId: opts?.actorId,
    },
  });
}

export async function listUserStreamingAccounts(
  userId: string
): Promise<StreamingAccountPublic[]> {
  const rows = await db.connectedStreamingAccount.findMany({
    where: { userId },
    orderBy: [{ verified: "desc" }, { createdAt: "desc" }],
    select: ACCOUNT_SELECT,
  });
  return rows.map(toPublicAccount);
}

export async function getVerifiedAccountsForUser(userId: string) {
  return db.connectedStreamingAccount.findMany({
    where: { userId, verified: true, revokedAt: null },
    orderBy: { channelName: "asc" },
    select: ACCOUNT_SELECT,
  });
}

export function startOAuthConnect(
  userId: string,
  platform: ConnectableStreamingPlatform
): { url: string } | { error: string } {
  const provider = getStreamingProvider(platform);
  if (!provider.supportsOAuth) {
    return { error: "이 플랫폼은 OAuth 연결을 지원하지 않습니다." };
  }
  const redirectUri = streamingOAuthRedirectUri(platform);
  const state = mintStreamingOAuthState(userId, platform);
  const url = provider.getConnectUrl(state, redirectUri);
  if (!url) {
    return {
      error: `${platform} OAuth 클라이언트가 설정되지 않았습니다.`,
    };
  }
  return { url };
}

async function assertChannelNotLinked(
  platform: ConnectableStreamingPlatform,
  channelId: string,
  userId: string
): Promise<{ error: string } | null> {
  const existing = await db.connectedStreamingAccount.findUnique({
    where: { platform_channelId: { platform, channelId } },
    select: { userId: true, id: true },
  });
  if (existing && existing.userId !== userId) {
    return {
      error: "이 스트리밍 계정은 이미 다른 MoCoMo 계정에 연결되어 있습니다.",
    };
  }
  return null;
}

export async function completeOAuthConnect(
  platform: ConnectableStreamingPlatform,
  code: string,
  state: string
): Promise<{ ok: true; accountId: string } | { ok: false; error: string }> {
  const verified = verifyStreamingOAuthState(state, platform);
  if ("error" in verified) return { ok: false, error: verified.error };

  const provider = getStreamingProvider(platform);
  const redirectUri = streamingOAuthRedirectUri(platform);

  let tokens: StreamingTokenPayload;
  let channel;
  try {
    const result = await provider.exchangeOAuthCode(code, redirectUri);
    tokens = result.tokens;
    channel = result.channel;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "OAuth 연결에 실패했습니다.";
    return { ok: false, error: msg };
  }

  const conflict = await assertChannelNotLinked(platform, channel.channelId, verified.userId);
  if (conflict) return { ok: false, error: conflict.error };

  const tokenFields =
    canStoreStreamingTokens() && tokens.accessToken
      ? encryptStreamingTokens(platform, tokens)
      : {};

  const existing = await db.connectedStreamingAccount.findUnique({
    where: {
      platform_channelId: { platform, channelId: channel.channelId },
    },
  });

  const account = existing
    ? await db.connectedStreamingAccount.update({
        where: { id: existing.id },
        data: {
          userId: verified.userId,
          channelName: channel.channelName,
          channelUrl: channel.channelUrl,
          profileImage: channel.profileImage,
          verified: true,
          verificationMethod: "OAUTH",
          verificationCode: null,
          verifiedAt: new Date(),
          revokedAt: null,
          revokedReason: null,
          tokenExpiresAt: tokens.expiresAt,
          ...tokenFields,
        },
        select: { id: true },
      })
    : await db.connectedStreamingAccount.create({
        data: {
          userId: verified.userId,
          platform,
          channelId: channel.channelId,
          channelName: channel.channelName,
          channelUrl: channel.channelUrl,
          profileImage: channel.profileImage,
          verified: true,
          verificationMethod: "OAUTH",
          verifiedAt: new Date(),
          tokenExpiresAt: tokens.expiresAt,
          ...tokenFields,
        },
        select: { id: true },
      });

  await logVerification(account.id, "CONNECT", {
    method: "OAUTH",
    actorId: verified.userId,
    detail: `${platform} OAuth verified channel ${channel.channelId}`,
  });

  return { ok: true, accountId: account.id };
}

export async function startManualConnect(
  userId: string,
  platform: ConnectableStreamingPlatform,
  channelInput: string
): Promise<
  | { ok: true; accountId: string; verificationCode: string }
  | { ok: false; error: string }
> {
  const provider = getStreamingProvider(platform);
  // YouTube supports OAuth + description-code fallback (Google consent screen may be Testing).
  if (provider.supportsOAuth && platform !== "YOUTUBE") {
    return { ok: false, error: "이 플랫폼은 OAuth로 연결해 주세요." };
  }

  const parsed = provider.parseManualChannelInput(channelInput);
  if ("error" in parsed) return { ok: false, error: parsed.error };

  let channel = parsed;
  if (platform === "CHZZK") {
    const { enrichChzzkChannel } = await import("./providers/chzzk");
    const enriched = await enrichChzzkChannel(parsed);
    if ("error" in enriched) return { ok: false, error: enriched.error };
    channel = enriched;
  } else if (platform === "YOUTUBE") {
    const { enrichYoutubeChannel } = await import("./providers/youtube");
    const enriched = await enrichYoutubeChannel(parsed);
    if ("error" in enriched) return { ok: false, error: enriched.error };
    channel = enriched;
  }

  const conflict = await assertChannelNotLinked(platform, channel.channelId, userId);
  if (conflict) return { ok: false, error: conflict.error };

  const code = generateVerificationCode();

  const existing = await db.connectedStreamingAccount.findUnique({
    where: {
      platform_channelId: { platform, channelId: channel.channelId },
    },
  });

  const account = existing
    ? await db.connectedStreamingAccount.update({
        where: { id: existing.id },
        data: {
          userId,
          channelName: channel.channelName,
          channelUrl: channel.channelUrl,
          profileImage: channel.profileImage,
          verified: false,
          verificationMethod: null,
          verificationCode: code,
          verifiedAt: null,
          revokedAt: null,
          revokedReason: null,
        },
        select: { id: true },
      })
    : await db.connectedStreamingAccount.create({
        data: {
          userId,
          platform,
          channelId: channel.channelId,
          channelName: channel.channelName,
          channelUrl: channel.channelUrl,
          profileImage: channel.profileImage,
          verified: false,
          verificationCode: code,
        },
        select: { id: true },
      });

  await logVerification(account.id, "CONNECT_PENDING", {
    method: "PROFILE_CODE",
    actorId: userId,
    detail: `Manual connect started for ${channel.channelId}`,
  });

  return { ok: true, accountId: account.id, verificationCode: code };
}

export async function verifyManualAccount(
  userId: string,
  accountId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const account = await db.connectedStreamingAccount.findUnique({
    where: { id: accountId },
    select: ACCOUNT_SELECT,
  });
  if (!account || account.userId !== userId) {
    return { ok: false, error: "계정을 찾을 수 없습니다." };
  }
  if (account.revokedAt) {
    return { ok: false, error: "해제된 계정입니다. 다시 연결해 주세요." };
  }
  if (account.verified) return { ok: true };
  if (!account.verificationCode) {
    return { ok: false, error: "검증 코드가 없습니다. 계정을 다시 연결해 주세요." };
  }

  const platform = account.platform as ConnectableStreamingPlatform;

  if (platform === "CHZZK") {
    const { diagnoseChzzkVerification } = await import("./providers/chzzk");
    const diagnosed = await diagnoseChzzkVerification(
      account.channelId,
      account.verificationCode
    );
    if (!diagnosed.ok) {
      await logVerification(account.id, "VERIFY_FAILED", {
        method: "PROFILE_CODE",
        success: false,
        actorId: userId,
        detail: diagnosed.error,
      });
      return { ok: false, error: diagnosed.error };
    }
  } else if (platform === "YOUTUBE") {
    const { diagnoseYoutubeVerification } = await import("./providers/youtube");
    const diagnosed = await diagnoseYoutubeVerification(
      account.channelUrl || account.channelId,
      account.verificationCode
    );
    if (!diagnosed.ok) {
      await logVerification(account.id, "VERIFY_FAILED", {
        method: "DESCRIPTION_CODE",
        success: false,
        actorId: userId,
        detail: diagnosed.error,
      });
      return { ok: false, error: diagnosed.error };
    }
  } else {
    const provider = getStreamingProvider(platform);
    const ok = await provider.verifyProfileCode(
      {
        channelId: account.channelId,
        channelName: account.channelName,
        channelUrl: account.channelUrl,
        profileImage: account.profileImage,
      },
      account.verificationCode
    );

    if (!ok) {
      await logVerification(account.id, "VERIFY_FAILED", {
        method: "PROFILE_CODE",
        success: false,
        actorId: userId,
        detail: "Verification code not found in profile/description",
      });
      return {
        ok: false,
        error:
          "채널 설명(또는 프로필)에 검증 코드가 없습니다. 코드를 붙여넣은 뒤 저장하고 다시 시도해 주세요.",
      };
    }
  }

  const method =
    platform === "YOUTUBE" ? ("DESCRIPTION_CODE" as const) : ("PROFILE_CODE" as const);

  await db.connectedStreamingAccount.update({
    where: { id: accountId },
    data: {
      verified: true,
      verificationMethod: method,
      verifiedAt: new Date(),
      verificationCode: null,
    },
  });

  await logVerification(account.id, "VERIFY", {
    method,
    actorId: userId,
  });

  return { ok: true };
}

export async function disconnectStreamingAccount(
  userId: string,
  accountId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const account = await db.connectedStreamingAccount.findUnique({
    where: { id: accountId },
    select: { userId: true },
  });
  if (!account || account.userId !== userId) {
    return { ok: false, error: "계정을 찾을 수 없습니다." };
  }

  await db.connectedStreamingAccount.update({
    where: { id: accountId },
    data: {
      verified: false,
      revokedAt: new Date(),
      revokedReason: "User disconnected",
      verificationCode: null,
      encryptedTokenData: null,
      encryptionIv: null,
      encryptionAuthTag: null,
      encryptionKeyId: null,
      tokenExpiresAt: null,
    },
  });
  await logVerification(accountId, "DISCONNECT", { actorId: userId });
  return { ok: true };
}

export async function getAccountTokens(
  account: ConnectedAccountRow
): Promise<StreamingTokenPayload | null> {
  let tokens = decryptStreamingTokens(account.platform, account);
  if (!tokens) return null;

  const provider = getStreamingProvider(account.platform as ConnectableStreamingPlatform);
  const expiresSoon =
    account.tokenExpiresAt && account.tokenExpiresAt.getTime() < Date.now() + 60_000;
  if (expiresSoon && tokens.refreshToken) {
    const refreshed = await provider.refreshTokens(tokens);
    if (refreshed) {
      tokens = refreshed;
      if (canStoreStreamingTokens()) {
        const fields = encryptStreamingTokens(account.platform, refreshed);
        await db.connectedStreamingAccount.update({
          where: { id: account.id },
          data: {
            tokenExpiresAt: refreshed.expiresAt,
            ...fields,
          },
        });
      }
    }
  }
  return tokens;
}

export async function resolveVerifiedLiveSource(accountId: string, userId: string) {
  const account = await db.connectedStreamingAccount.findUnique({
    where: { id: accountId },
    select: ACCOUNT_SELECT,
  });
  if (!account || account.userId !== userId) {
    return { error: "스트리밍 계정을 찾을 수 없습니다." };
  }
  if (!account.verified || account.revokedAt) {
    return { error: "인증되지 않았거나 해제된 스트리밍 계정입니다." };
  }

  const platform = account.platform as ConnectableStreamingPlatform;
  const provider = getStreamingProvider(platform);
  const tokens = provider.supportsOAuth ? await getAccountTokens(account) : null;
  return provider.resolveLiveSource(account, tokens);
}

export { logVerification };
