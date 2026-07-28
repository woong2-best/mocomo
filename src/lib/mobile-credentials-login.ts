import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { isServiceBanned } from "@/lib/account-status";
import { canRecoverAccount, isAccountPastRecovery } from "@/lib/account-deletion";
import { checkLoginRateLimit, recordLoginAttempt } from "@/lib/auth-rate-limit";
import {
  CREDENTIALS_JWT_USER_SELECT,
  toCredentialsAuthUser,
  type CredentialsJwtUser,
} from "@/lib/auth-credentials";
import {
  LoginBannedError,
  LoginAccountDeletedError,
  LoginAccountPendingRecoveryError,
  LoginEmailNotVerifiedError,
  LoginInvalidCredentialsError,
  LoginOAuthOnlyError,
  LoginRateLimitedError,
} from "@/lib/auth-login-errors";

export type MobileCredentialsUser = ReturnType<typeof toCredentialsAuthUser>;

/**
 * Shared credentials validation for web NextAuth authorize + mobile login.
 * Throws the same Login*Error classes as auth.providers.
 */
export async function authenticateCredentialsUser(
  loginIdRaw: string,
  password: string,
  ip: string | null
): Promise<MobileCredentialsUser> {
  const loginId = loginIdRaw.trim();
  const loginKey = loginId.toLowerCase();
  const ipKey = ip?.trim() || "unknown";

  const [rate, user] = await Promise.all([
    checkLoginRateLimit(loginKey, ipKey),
    loginId.includes("@")
      ? db.user.findUnique({
          where: { email: loginKey },
          select: CREDENTIALS_JWT_USER_SELECT,
        })
      : db.user.findFirst({
          where: { username: { equals: loginId, mode: "insensitive" } },
          select: CREDENTIALS_JWT_USER_SELECT,
        }),
  ]);

  if (!rate.ok) throw new LoginRateLimitedError();

  const fail = () => {
    void recordLoginAttempt(loginKey, ipKey);
    throw new LoginInvalidCredentialsError();
  };

  if (!user) return fail();
  if (isServiceBanned(user)) throw new LoginBannedError();
  if (user.deletedAt) {
    if (isAccountPastRecovery(user)) throw new LoginAccountDeletedError();
    if (!canRecoverAccount(user)) throw new LoginAccountPendingRecoveryError();
  }
  if (!user.passwordHash) throw new LoginOAuthOnlyError();

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return fail();

  if (!user.emailVerified) throw new LoginEmailNotVerifiedError();

  return toCredentialsAuthUser(user as CredentialsJwtUser);
}
