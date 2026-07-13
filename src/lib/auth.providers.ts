import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Discord from "next-auth/providers/discord";
import Twitter from "next-auth/providers/twitter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { isServiceBanned } from "@/lib/account-status";
import { canRecoverAccount, isAccountPastRecovery } from "@/lib/account-deletion";
import { checkLoginRateLimit, recordLoginAttempt } from "@/lib/auth-rate-limit";
import { getRequestIp } from "@/lib/request-ip";
import {
  CREDENTIALS_JWT_USER_SELECT,
  toCredentialsAuthUser,
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

const credentialsProvider = Credentials({
  name: "credentials",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    if (!credentials?.email || !credentials?.password) return null;
    const email = String(credentials.email).trim().toLowerCase();
    const password = String(credentials.password);

    const ip = await getRequestIp();
    const [rate, user] = await Promise.all([
      checkLoginRateLimit(email, ip),
      db.user.findUnique({
        where: { email },
        select: CREDENTIALS_JWT_USER_SELECT,
      }),
    ]);

    if (!rate.ok) throw new LoginRateLimitedError();

    const fail = () => {
      void recordLoginAttempt(email, ip);
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

    return toCredentialsAuthUser(user);
  },
});

/** OAuth 프로바이더 공통 — allowDangerousEmailAccountLinking 미사용 (검증된 이메일만 어댑터에서 연동) */
export function getAuthProviders(): NonNullable<NextAuthConfig["providers"]> {
  const providers: NonNullable<NextAuthConfig["providers"]> = [credentialsProvider];

  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
    providers.push(
      Google({
        clientId: process.env.AUTH_GOOGLE_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET,
      })
    );
  } else if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      })
    );
  }

  if (process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET) {
    providers.push(
      Discord({
        clientId: process.env.AUTH_DISCORD_ID,
        clientSecret: process.env.AUTH_DISCORD_SECRET,
        authorization: {
          params: { scope: "identify email" },
        },
      })
    );
  }

  if (process.env.AUTH_TWITTER_ID && process.env.AUTH_TWITTER_SECRET) {
    providers.push(
      Twitter({
        clientId: process.env.AUTH_TWITTER_ID,
        clientSecret: process.env.AUTH_TWITTER_SECRET,
        authorization: {
          url: "https://x.com/i/oauth2/authorize",
          params: { scope: "users.read" },
        },
      })
    );
  }

  return providers;
}
