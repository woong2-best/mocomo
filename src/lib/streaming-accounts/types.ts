import type {
  ConnectedStreamingAccount,
  StreamingPlatform,
  StreamingVerificationMethod,
} from "@prisma/client";
import type { LiveExternalProvider, ParsedExternalLiveSource } from "@/lib/live-external/types";

export type { StreamingPlatform, StreamingVerificationMethod };

/** OAuth 가능 플랫폼 */
export const OAUTH_STREAMING_PLATFORMS = ["YOUTUBE", "TWITCH", "CHZZK"] as const;
export type OAuthStreamingPlatform = (typeof OAUTH_STREAMING_PLATFORMS)[number];

/** 수동 검증 플랫폼 */
export const MANUAL_STREAMING_PLATFORMS = ["KICK"] as const;
export type ManualStreamingPlatform = (typeof MANUAL_STREAMING_PLATFORMS)[number];

export const CONNECTABLE_STREAMING_PLATFORMS = [
  ...OAUTH_STREAMING_PLATFORMS,
  ...MANUAL_STREAMING_PLATFORMS,
] as const;
export type ConnectableStreamingPlatform = (typeof CONNECTABLE_STREAMING_PLATFORMS)[number];

export function isConnectablePlatform(p: string): p is ConnectableStreamingPlatform {
  return (CONNECTABLE_STREAMING_PLATFORMS as readonly string[]).includes(p);
}

export function platformToLiveExternal(
  platform: StreamingPlatform
): LiveExternalProvider | null {
  if (platform === "YOUTUBE" || platform === "TWITCH" || platform === "CHZZK") {
    return platform;
  }
  return null;
}

export type StreamingTokenPayload = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scope: string | null;
};

export type StreamingChannelInfo = {
  channelId: string;
  channelName: string;
  channelUrl: string;
  profileImage: string | null;
};

export type ConnectedAccountRow = Pick<
  ConnectedStreamingAccount,
  | "id"
  | "userId"
  | "platform"
  | "channelId"
  | "channelName"
  | "channelUrl"
  | "profileImage"
  | "verified"
  | "verificationMethod"
  | "verificationCode"
  | "verifiedAt"
  | "encryptedTokenData"
  | "encryptionIv"
  | "encryptionAuthTag"
  | "encryptionKeyId"
  | "tokenExpiresAt"
  | "revokedAt"
>;

export type StreamingConnectResult =
  | { ok: true; accountId: string; verified: boolean }
  | { ok: false; error: string };

export type StreamingVerifyResult =
  | { ok: true; method: StreamingVerificationMethod }
  | { ok: false; error: string };

/** 플랫폼별 OAuth·검증·라이브 해석 */
export interface StreamingPlatformProvider {
  readonly platform: ConnectableStreamingPlatform;
  readonly supportsOAuth: boolean;

  /** OAuth authorize URL (supportsOAuth=false → null) */
  getConnectUrl(state: string, redirectUri: string): string | null;

  /** OAuth code → tokens + channel info */
  exchangeOAuthCode(
    code: string,
    redirectUri: string,
    opts?: { state?: string }
  ): Promise<{ tokens: StreamingTokenPayload; channel: StreamingChannelInfo }>;

  /** 수동 연결 — 채널 URL/ID 파싱 (검증 전) */
  parseManualChannelInput(raw: string): StreamingChannelInfo | { error: string };

  /** 프로필/설명에 verificationCode 포함 여부 확인 */
  verifyProfileCode(
    channel: StreamingChannelInfo,
    verificationCode: string
  ): Promise<boolean>;

  /** OAuth 토큰 갱신 */
  refreshTokens(tokens: StreamingTokenPayload): Promise<StreamingTokenPayload | null>;

  /** 현재 라이브 임베드 소스 해석 (verified account + tokens) */
  resolveLiveSource(
    account: ConnectedAccountRow,
    tokens: StreamingTokenPayload | null
  ): Promise<ParsedExternalLiveSource | { error: string }>;
}

export type StreamingAccountPublic = {
  id: string;
  platform: StreamingPlatform;
  channelId: string;
  channelName: string;
  channelUrl: string;
  profileImage: string | null;
  verified: boolean;
  verificationMethod: StreamingVerificationMethod | null;
  verifiedAt: Date | null;
  pendingVerification: boolean;
  verificationCode: string | null;
  revokedAt: Date | null;
};
