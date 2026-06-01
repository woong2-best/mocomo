import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Discord from "next-auth/providers/discord";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { checkLoginRateLimit, recordLoginAttempt } from "@/lib/auth-rate-limit";
import { getRequestIp } from "@/lib/request-ip";
import {
  CREDENTIALS_JWT_USER_SELECT,
  toCredentialsAuthUser,
} from "@/lib/auth-credentials";

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

    if (!rate.ok) return null;

    const fail = () => {
      void recordLoginAttempt(email, ip);
      return null;
    };

    if (!user?.passwordHash || user.isBanned) return fail();

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return fail();

    if (!user.emailVerified) return fail();

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

  return providers;
}
