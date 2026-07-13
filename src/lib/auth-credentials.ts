import type { User } from "@prisma/client";
import { isServiceBanned, isSuspendedReadOnly } from "@/lib/account-status";
import { effectiveRole } from "@/lib/operator-config";

/** credentials authorize → jwt 에 넘기는 필드 (DB 재조회 생략) */
export const CREDENTIALS_JWT_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  image: true,
  passwordHash: true,
  isBanned: true,
  accountStatus: true,
  deletedAt: true,
  scheduledPurgeAt: true,
  emailVerified: true,
  username: true,
  role: true,
  premiumTier: true,
  level: true,
  locale: true,
  countryCode: true,
} as const;

export type CredentialsJwtUser = Pick<
  User,
  | "id"
  | "email"
  | "name"
  | "image"
  | "passwordHash"
  | "isBanned"
  | "accountStatus"
  | "deletedAt"
  | "scheduledPurgeAt"
  | "emailVerified"
  | "username"
  | "role"
  | "premiumTier"
  | "level"
  | "locale"
  | "countryCode"
>;

export function toCredentialsAuthUser(user: CredentialsJwtUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    isBanned: isServiceBanned(user),
    accountStatus: user.accountStatus,
    isSuspendedReadOnly: isSuspendedReadOnly(user),
    username: user.username,
    role: effectiveRole(user),
    premiumTier: user.premiumTier,
    level: user.level,
    locale: user.locale,
    countryCode: user.countryCode,
  };
}

export function hydrateTokenFromCredentialsUser(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  token: any,
  user: {
    id: string;
    username?: string;
    role?: string;
    premiumTier?: string;
    level?: number;
    locale?: string;
    countryCode?: string;
    isBanned?: boolean;
    accountStatus?: string;
    isSuspendedReadOnly?: boolean;
  }
) {
  token.id = user.id;
  token.username = user.username;
  token.role = user.role;
  token.premiumTier = user.premiumTier;
  token.level = user.level;
  token.locale = user.locale;
  token.countryCode = user.countryCode;
  token.isBanned = user.isBanned;
  token.accountStatus = user.accountStatus;
  token.isSuspendedReadOnly = user.isSuspendedReadOnly;
}

export function credentialsUserHasJwtFields(
  user: { username?: string | null } | null | undefined
): boolean {
  return !!user?.username;
}
