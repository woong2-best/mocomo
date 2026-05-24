import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Discord from "next-auth/providers/discord";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

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

    const user = await db.user.findUnique({ where: { email } });
    if (!user?.passwordHash || user.isBanned) return null;

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;

    if (!user.emailVerified) {
      const verifyId = `verify:${email}`;
      const pending = await db.verificationToken.findFirst({
        where: { identifier: verifyId, expires: { gt: new Date() } },
      });
      if (pending) return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
    };
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
      })
    );
  }

  return providers;
}
