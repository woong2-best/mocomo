import { cache } from "react";
import NextAuth from "next-auth";
import { db } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";
import { getAuthProviders } from "@/lib/auth.providers";
import { createPrismaAuthAdapter } from "@/lib/auth.adapter";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: createPrismaAuthAdapter(),
  providers: getAuthProviders(),
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger }) {
      if (user?.id) {
        token.id = user.id;
      }
      if (user?.id || trigger === "update") {
        const userId = (user?.id ?? token.id) as string;
        const dbUser = await db.user.findUnique({
          where: { id: userId },
          select: {
            username: true,
            role: true,
            premiumTier: true,
            level: true,
            locale: true,
            countryCode: true,
          },
        });
        if (dbUser) {
          token.username = dbUser.username;
          token.role = dbUser.role;
          token.premiumTier = dbUser.premiumTier;
          token.level = dbUser.level;
          token.locale = dbUser.locale;
          token.countryCode = dbUser.countryCode;
        }
      }
      return token;
    },
  },
});

/** 요청당 세션 1회만 해석 (레이아웃·페이지·액션 중복 auth 방지) */
export const getCachedSession = cache(async () => auth());

export async function getAuthUserId(): Promise<string | null> {
  const session = await getCachedSession();
  return session?.user?.id ?? null;
}

export const getCachedCurrentUser = cache(async () => {
  const session = await getCachedSession();
  if (!session?.user?.id) return null;
  return db.user.findUnique({
    where: { id: session.user.id },
    include: { profile: true, cosplayerProfile: true },
  });
});

export async function getCurrentUser() {
  return getCachedCurrentUser();
}

export async function requireAuth() {
  const user = await getCachedCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  if (user.isBanned) throw new Error("BANNED");
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== "ADMIN" && user.role !== "MODERATOR") throw new Error("FORBIDDEN");
  return user;
}
