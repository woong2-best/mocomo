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
import { recordUserAccessLog, type UserAccessChannel } from "@/lib/user-access-log";

export type MobileCredentialsUser = ReturnType<typeof toCredentialsAuthUser>;

type CredentialsUserRow = CredentialsJwtUser;

/**
 * Resolve login id the way users actually type it.
 * Web sign-in only collects Gmail/Naver *local part* and appends the domain;
 * mobile free-text often sends that same local part without `@` — treat it as
 * username first, then fall back to `@gmail.com` / `@naver.com` emails.
 */
async function findCredentialsUserByLogin(
  loginId: string
): Promise<CredentialsUserRow | null> {
  const loginKey = loginId.toLowerCase();

  if (loginId.includes("@")) {
    return db.user.findUnique({
      where: { email: loginKey },
      select: CREDENTIALS_JWT_USER_SELECT,
    });
  }

  const byUsername = await db.user.findFirst({
    where: { username: { equals: loginId, mode: "insensitive" } },
    select: CREDENTIALS_JWT_USER_SELECT,
  });
  if (byUsername) return byUsername;

  // Match web SignInForm: bare local-part → Gmail, then Naver.
  for (const domain of ["gmail.com", "naver.com"] as const) {
    const email = `${loginKey}@${domain}`;
    const byEmail = await db.user.findUnique({
      where: { email },
      select: CREDENTIALS_JWT_USER_SELECT,
    });
    if (byEmail) return byEmail;
  }

  return null;
}

/**
 * Shared credentials validation for web NextAuth authorize + mobile login.
 * Throws the same Login*Error classes as auth.providers.
 */
export async function authenticateCredentialsUser(
  loginIdRaw: string,
  password: string,
  ip: string | null,
  opts?: { channel?: UserAccessChannel; platform?: "android" | "ios" }
): Promise<MobileCredentialsUser> {
  const loginId = loginIdRaw.trim();
  const loginKey = loginId.toLowerCase();
  const ipKey = ip?.trim() || "unknown";
  const channel = opts?.channel ?? "web";

  const logFail = (reason: string, user?: CredentialsUserRow | null) => {
    void recordUserAccessLog({
      userId: user?.id,
      username: user?.username ?? loginId,
      email: user?.email ?? (loginId.includes("@") ? loginKey : null),
      success: false,
      failureReason: reason,
      channel,
      provider: "credentials",
      platform: opts?.platform ?? null,
      ip,
    });
  };

  const [rate, user] = await Promise.all([
    checkLoginRateLimit(loginKey, ipKey),
    findCredentialsUserByLogin(loginId),
  ]);

  if (!rate.ok) {
    logFail("rate_limited", user);
    throw new LoginRateLimitedError();
  }

  const fail = () => {
    void recordLoginAttempt(loginKey, ipKey);
    logFail("invalid_credentials", user);
    throw new LoginInvalidCredentialsError();
  };

  if (!user) return fail();
  if (isServiceBanned(user)) {
    logFail("banned", user);
    throw new LoginBannedError();
  }
  if (user.deletedAt) {
    if (isAccountPastRecovery(user)) {
      logFail("account_deleted", user);
      throw new LoginAccountDeletedError();
    }
    if (!canRecoverAccount(user)) {
      logFail("account_pending_recovery", user);
      throw new LoginAccountPendingRecoveryError();
    }
  }
  if (!user.passwordHash) {
    logFail("oauth_only", user);
    throw new LoginOAuthOnlyError();
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return fail();

  if (!user.emailVerified) {
    logFail("email_not_verified", user);
    throw new LoginEmailNotVerifiedError();
  }

  void recordUserAccessLog({
    userId: user.id,
    username: user.username,
    email: user.email,
    success: true,
    channel,
    provider: "credentials",
    platform: opts?.platform ?? null,
    ip,
  });

  return toCredentialsAuthUser(user as CredentialsJwtUser);
}
