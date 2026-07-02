import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Discord from "next-auth/providers/discord";
import Twitter from "next-auth/providers/twitter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { checkLoginRateLimit, recordLoginAttempt } from "@/lib/auth-rate-limit";
import { getRequestIp } from "@/lib/request-ip";
import {
  CREDENTIALS_JWT_USER_SELECT,
  toCredentialsAuthUser,
} from "@/lib/auth-credentials";
import {
  LoginBannedError,
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
    if (user.isBanned) throw new LoginBannedError();
    if (!user.passwordHash) throw new LoginOAuthOnlyError();

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return fail();

    if (!user.emailVerified) throw new LoginEmailNotVerifiedError();

    return toCredentialsAuthUser(user);
  },
});

export function getAuthProviders(): NonNullable<NextAuthConfig["providers"]> {
  const providers: NonNullable<NextAuthConfig["providers"]> = [credentialsProvider];

  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
    providers.push(
      Google({
        clientId: process.env.AUTH_GOOGLE_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET,
        allowDangerousEmailAccountLinking: true,
      })
    );
  }

  if (process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET) {
    providers.push(
      Discord({
        clientId: process.env.AUTH_DISCORD_ID,
        clientSecret: process.env.AUTH_DISCORD_SECRET,
        allowDangerousEmailAccountLinking: true,
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
        allowDangerousEmailAccountLinking: true,
        // scope만 덮어쓰면 기본 authorization URL이 사라져 Configuration 오류가 납니다.
        authorization: {
          url: "https://x.com/i/oauth2/authorize",
          params: { scope: "users.read" },
        },
      })
    );
  }

  return providers;
}
