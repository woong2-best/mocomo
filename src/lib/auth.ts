import { cache } from "react";
import NextAuth from "next-auth";
import { db } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";
import { getAuthProviders } from "@/lib/auth.providers";
import { createPrismaAuthAdapter } from "@/lib/auth.adapter";
import { effectiveRole, isOperatorIdentity } from "@/lib/operator-config";
import {
  credentialsUserHasJwtFields,
  hydrateTokenFromCredentialsUser,
} from "@/lib/auth-credentials";

const useSecureCookies = process.env.NODE_ENV === "production";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: createPrismaAuthAdapter(),
  providers: getAuthProviders(),
  cookies: {
    sessionToken: {
      name: useSecureCookies ? "__Secure-authjs.session-token" : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
  },
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user }) {
      if (!user?.id) return true;
      if (typeof user.isBanned === "boolean") {
        return !user.isBanned;
      }
      const dbUser = await db.user.findUnique({
        where: { id: user.id },
        select: { isBanned: true },
      });
      return !dbUser?.isBanned;
    },
    async jwt({ token, user, trigger }) {
      if (user?.id && credentialsUserHasJwtFields(user)) {
        hydrateTokenFromCredentialsUser(
          token,
          user as {
            id: string;
            username?: string;
            role?: string;
            premiumTier?: string;
            level?: number;
            locale?: string;
            countryCode?: string;
            isBanned?: boolean;
          }
        );
        return token;
      }

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
            email: true,
            premiumTier: true,
            level: true,
            locale: true,
            countryCode: true,
            isBanned: true,
          },
        });
        if (dbUser) {
          token.username = dbUser.username;
          token.role = effectiveRole(dbUser);
          token.premiumTier = dbUser.premiumTier;
          token.level = dbUser.level;
          token.locale = dbUser.locale;
          token.countryCode = dbUser.countryCode;
          token.isBanned = dbUser.isBanned;
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

/** 좋아요·북마크 등 가벼운 액션 — profile/cosplayer 조인 생략 */
export const getCachedAuthUserMinimal = cache(async () => {
  const session = await getCachedSession();
  if (!session?.user?.id) return null;
  return db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      username: true,
      image: true,
      isBanned: true,
      role: true,
      supportTierSent: true,
    },
  });
});

export async function requireAuthMinimal() {
  const user = await getCachedAuthUserMinimal();
  if (!user) throw new Error("UNAUTHORIZED");
  if (user.isBanned) throw new Error("BANNED");
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (!isOperatorIdentity({ username: user.username, role: user.role, email: user.email })) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

/** UI 표시용 — 환경 변수에 지정된 운영자 계정만 */
export function isSiteOperator(user: { username: string; role: string; email?: string | null }) {
  return isOperatorIdentity(user);
}
