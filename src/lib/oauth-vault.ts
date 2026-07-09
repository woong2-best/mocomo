import type { Account, User } from "@prisma/client";
import { db } from "@/lib/db";
import {
  decryptAes256Gcm,
  encryptAes256Gcm,
  hmacOAuthEmail,
  hmacOAuthSub,
  isOAuthEncryptionConfigured,
} from "@/lib/encryption";

/** AES-256-GCM vault 대상 OAuth 프로바이더 */
export const OAUTH_VAULT_PROVIDERS = ["google", "discord", "twitter"] as const;
export type OAuthVaultProvider = (typeof OAUTH_VAULT_PROVIDERS)[number];

export function isOAuthVaultProvider(
  provider: string
): provider is OAuthVaultProvider {
  return (OAUTH_VAULT_PROVIDERS as readonly string[]).includes(provider);
}

export type OAuthVaultPayload = {
  sub: string;
  email: string | null;
  name: string | null;
  image: string | null;
  accessToken: string | null;
  refreshToken: string | null;
};

export type OAuthAccountRow = Pick<
  Account,
  | "id"
  | "userId"
  | "provider"
  | "providerAccountId"
  | "googleSubHash"
  | "googleEmailHash"
  | "encryptedGoogleData"
  | "encryptionIv"
  | "encryptionAuthTag"
  | "encryptionKeyId"
  | "access_token"
  | "refresh_token"
  | "id_token"
>;

export function isOAuthAccountEncrypted(
  account: Pick<Account, "encryptedGoogleData" | "encryptionIv" | "encryptionAuthTag">
): boolean {
  return Boolean(
    account.encryptedGoogleData && account.encryptionIv && account.encryptionAuthTag
  );
}

export function encryptOAuthPayload(
  provider: OAuthVaultProvider,
  payload: OAuthVaultPayload
): Pick<
  Account,
  | "encryptedGoogleData"
  | "encryptionIv"
  | "encryptionAuthTag"
  | "encryptionKeyId"
  | "googleSubHash"
  | "googleEmailHash"
> {
  const envelope = JSON.stringify({ provider, ...payload });
  const blob = encryptAes256Gcm(envelope);
  return {
    googleSubHash: hmacOAuthSub(provider, payload.sub),
    googleEmailHash: payload.email ? hmacOAuthEmail(provider, payload.email) : null,
    encryptedGoogleData: blob.ciphertext,
    encryptionIv: blob.iv,
    encryptionAuthTag: blob.authTag,
    encryptionKeyId: blob.keyId ?? null,
  };
}

export function decryptOAuthPayload(
  provider: OAuthVaultProvider,
  account: Pick<
    Account,
    | "encryptedGoogleData"
    | "encryptionIv"
    | "encryptionAuthTag"
    | "encryptionKeyId"
  >
): OAuthVaultPayload | null {
  if (!isOAuthAccountEncrypted(account)) return null;
  try {
    const json = decryptAes256Gcm({
      ciphertext: account.encryptedGoogleData!,
      iv: account.encryptionIv!,
      authTag: account.encryptionAuthTag!,
      keyId: account.encryptionKeyId ?? undefined,
    });
    const parsed = JSON.parse(json) as OAuthVaultPayload & { provider?: string };
    if (parsed.provider && parsed.provider !== provider) return null;
    return {
      sub: parsed.sub,
      email: parsed.email ?? null,
      name: parsed.name ?? null,
      image: parsed.image ?? null,
      accessToken: parsed.accessToken ?? null,
      refreshToken: parsed.refreshToken ?? null,
    };
  } catch {
    return null;
  }
}

export function oauthSubLookupHash(
  provider: OAuthVaultProvider,
  sub: string
): string {
  return hmacOAuthSub(provider, sub);
}

export async function persistEncryptedOAuthAccount(input: {
  provider: OAuthVaultProvider;
  accountId?: string;
  userId: string;
  sub: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  idToken?: string | null;
  expiresAt?: number | null;
  tokenType?: string | null;
  scope?: string | null;
  sessionState?: string | null;
  type?: string;
}): Promise<void> {
  if (!isOAuthEncryptionConfigured()) {
    throw new Error("OAUTH_ENCRYPTION_KEY is required for OAuth vault");
  }

  const user = await db.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      username: true,
      passwordHash: true,
    },
  });
  if (!user) throw new Error("USER_NOT_FOUND");

  const payload: OAuthVaultPayload = {
    sub: input.sub,
    email: input.email ?? user.email ?? null,
    name: input.name ?? user.name ?? null,
    image: input.image ?? user.image ?? null,
    accessToken: input.accessToken ?? null,
    refreshToken: input.refreshToken ?? null,
  };

  const encrypted = encryptOAuthPayload(input.provider, payload);
  const subHash = encrypted.googleSubHash!;

  const accountData = {
    type: input.type ?? "oauth",
    provider: input.provider,
    providerAccountId: subHash,
    googleSubHash: subHash,
    googleEmailHash: encrypted.googleEmailHash,
    encryptedGoogleData: encrypted.encryptedGoogleData,
    encryptionIv: encrypted.encryptionIv,
    encryptionAuthTag: encrypted.encryptionAuthTag,
    encryptionKeyId: encrypted.encryptionKeyId,
    access_token: null,
    refresh_token: null,
    id_token: null,
    expires_at: input.expiresAt ?? null,
    token_type: input.tokenType ?? null,
    scope: input.scope ?? null,
    session_state: input.sessionState ?? null,
  };

  if (input.accountId) {
    await db.account.update({
      where: { id: input.accountId },
      data: accountData,
    });
  } else {
    await db.account.create({
      data: { ...accountData, userId: input.userId },
    });
  }

  if (!user.passwordHash) {
    await db.user.update({
      where: { id: user.id },
      data: {
        email: null,
        name: user.username,
        image: null,
      },
    });
  }
}

export async function migratePlainOAuthAccount(
  account: OAuthAccountRow,
  plainSub?: string
): Promise<boolean> {
  if (!isOAuthVaultProvider(account.provider)) return false;
  if (!isOAuthEncryptionConfigured()) return false;
  if (isOAuthAccountEncrypted(account)) return true;

  const sub = plainSub ?? account.providerAccountId;
  if (!sub) return false;

  if (
    !plainSub &&
    /^[a-f0-9]{64}$/i.test(sub) &&
    account.googleSubHash === sub
  ) {
    return false;
  }

  const user = await db.user.findUnique({
    where: { id: account.userId },
    select: { email: true, name: true, image: true },
  });

  await persistEncryptedOAuthAccount({
    provider: account.provider,
    accountId: account.id,
    userId: account.userId,
    sub,
    email: user?.email ?? null,
    name: user?.name ?? null,
    image: user?.image ?? null,
    accessToken: account.access_token,
    refreshToken: account.refresh_token,
    idToken: account.id_token,
  });

  return true;
}

export async function findOAuthAccountBySub(
  provider: OAuthVaultProvider,
  sub: string
): Promise<(OAuthAccountRow & { user: User }) | null> {
  const hash = oauthSubLookupHash(provider, sub);

  const account = await db.account.findFirst({
    where: {
      provider,
      OR: [
        { googleSubHash: hash },
        { providerAccountId: hash },
        { providerAccountId: sub },
      ],
    },
    include: { user: true },
  });

  if (!account) return null;

  if (!isOAuthAccountEncrypted(account)) {
    await migratePlainOAuthAccount(account, sub);
    return db.account.findUnique({
      where: { id: account.id },
      include: { user: true },
    });
  }

  return account;
}

export async function findUserIdByOAuthEmail(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  const byUser = await db.user.findUnique({
    where: { email: normalized },
    select: { id: true },
  });
  if (byUser) return byUser.id;

  if (!isOAuthEncryptionConfigured()) return null;

  for (const provider of OAUTH_VAULT_PROVIDERS) {
    const emailHash = hmacOAuthEmail(provider, normalized);
    const account = await db.account.findFirst({
      where: { provider, googleEmailHash: emailHash },
      select: { userId: true },
    });
    if (account) return account.userId;
  }

  return null;
}

/** 서버 전용 — OAuth 프로필 복원 (DB에는 저장 안 함) */
export async function hydrateUserOAuthProfile<
  T extends Pick<User, "id" | "name" | "image" | "email" | "passwordHash">,
>(user: T): Promise<T> {
  if (!isOAuthEncryptionConfigured()) return user;
  if (user.passwordHash) return user;

  const accounts = await db.account.findMany({
    where: {
      userId: user.id,
      provider: { in: [...OAUTH_VAULT_PROVIDERS] },
    },
    select: {
      provider: true,
      encryptedGoogleData: true,
      encryptionIv: true,
      encryptionAuthTag: true,
      encryptionKeyId: true,
    },
  });

  let name = user.name;
  let image = user.image;
  let email = user.email;

  for (const account of accounts) {
    if (!isOAuthVaultProvider(account.provider)) continue;
    const payload = decryptOAuthPayload(account.provider, account);
    if (!payload) continue;
    name = name ?? payload.name ?? name;
    image = image ?? payload.image ?? image;
    email = email ?? payload.email ?? email;
  }

  return { ...user, name, image, email };
}
