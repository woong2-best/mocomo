import type { ConnectedStreamingAccount } from "@prisma/client";
import {
  decryptAes256Gcm,
  encryptAes256Gcm,
  isOAuthEncryptionConfigured,
} from "@/lib/encryption";
import type { StreamingTokenPayload } from "./types";

type EncryptedFields = Pick<
  ConnectedStreamingAccount,
  | "encryptedTokenData"
  | "encryptionIv"
  | "encryptionAuthTag"
  | "encryptionKeyId"
>;

export function isStreamingTokenEncrypted(
  account: Pick<ConnectedStreamingAccount, "encryptedTokenData" | "encryptionIv" | "encryptionAuthTag">
): boolean {
  return Boolean(
    account.encryptedTokenData && account.encryptionIv && account.encryptionAuthTag
  );
}

export function encryptStreamingTokens(
  platform: string,
  tokens: StreamingTokenPayload
): EncryptedFields {
  const envelope = JSON.stringify({
    platform,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt?.toISOString() ?? null,
    scope: tokens.scope,
  });
  const blob = encryptAes256Gcm(envelope);
  return {
    encryptedTokenData: blob.ciphertext,
    encryptionIv: blob.iv,
    encryptionAuthTag: blob.authTag,
    encryptionKeyId: blob.keyId ?? null,
  };
}

export function decryptStreamingTokens(
  platform: string,
  account: EncryptedFields
): StreamingTokenPayload | null {
  if (!isStreamingTokenEncrypted(account)) return null;
  try {
    const json = decryptAes256Gcm({
      ciphertext: account.encryptedTokenData!,
      iv: account.encryptionIv!,
      authTag: account.encryptionAuthTag!,
      keyId: account.encryptionKeyId ?? undefined,
    });
    const parsed = JSON.parse(json) as StreamingTokenPayload & {
      platform?: string;
      expiresAt?: string | null;
    };
    if (parsed.platform && parsed.platform !== platform) return null;
    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken ?? null,
      expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
      scope: parsed.scope ?? null,
    };
  } catch {
    return null;
  }
}

export function canStoreStreamingTokens(): boolean {
  return isOAuthEncryptionConfigured();
}
