import { cache } from "react";
import NextAuth from "next-auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";
import { getAuthProviders } from "@/lib/auth.providers";
import { createPrismaAuthAdapter } from "@/lib/auth.adapter";
import { effectiveRole, isOperatorIdentity, isStaffIdentity } from "@/lib/operator-config";
import {
  credentialsUserHasJwtFields,
  hydrateTokenFromCredentialsUser,
} from "@/lib/auth-credentials";
import { recordUserDeviceFromRequest } from "@/lib/apt/economy/fraud/fraud-restrictions";
import { recoverDeletedAccount } from "@/lib/account-deletion-server";
import { canRecoverAccount, isAccountPastRecovery } from "@/lib/account-deletion";
import { hydrateUserOAuthProfile, findUserIdByOAuthEmail } from "@/lib/oauth-vault";
import {
  readOAuthFlowCookie,
  signupRedirectForOAuthEmail,
} from "@/lib/oauth-flow-cookie";
import { logSiteAdminAudit } from "@/lib/site-admin-audit";
import { recordUserAccessLog } from "@/lib/user-access-log";
import {
  assertAccountCanWrite,
  isServiceBanned,
  isSuspendedReadOnly,
  type AccountWriteKind,
} from "@/lib/account-status";

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
    async signIn({ user, account, profile }) {
      const isOAuth = account?.type === "oauth" || account?.type === "oidc";
      const oauthFlow = isOAuth ? await readOAuthFlowCookie() : null;

      const userSelect = {
        id: true,
        isBanned: true,
        accountStatus: true,
        deletedAt: true,
        scheduledPurgeAt: true,
        emailVerified: true,
      } as const;

      type SignInUserRow = {
        id: string;
        isBanned: boolean;
        accountStatus: import("@prisma/client").AccountStatus;
        deletedAt: Date | null;
        scheduledPurgeAt: Date | null;
        emailVerified: Date | null;
      };

      async function resolveUserByEmail(email: string | null | undefined): Promise<SignInUserRow | null> {
        const normalized = email?.trim().toLowerCase();
        if (!normalized) return null;

        const byEmail = await db.user.findUnique({
          where: { email: normalized },
          select: userSelect,
        });
        if (byEmail) return byEmail;

        const oauthUserId = await findUserIdByOAuthEmail(normalized);
        if (!oauthUserId) return null;

        return db.user.findUnique({
          where: { id: oauthUserId },
          select: userSelect,
        });
      }

      function oauthProviderEmailVerified(): boolean {
        if (account?.provider === "naver") return Boolean(user.email?.trim());
        return Boolean(
          (profile as { email_verified?: boolean } | undefined)?.email_verified ??
            (profile as { verified_email?: boolean } | undefined)?.verified_email
        );
      }

      if (isOAuth && oauthFlow !== "signup") {
        let existing: SignInUserRow | null = null;

        if (user.id) {
          existing = await db.user.findUnique({
            where: { id: user.id },
            select: userSelect,
          });
        }
        if (!existing) {
          existing = await resolveUserByEmail(user.email);
        }

        if (!existing) {
          return signupRedirectForOAuthEmail(user.email);
        }
        if (!existing.emailVerified) {
          return signupRedirectForOAuthEmail(user.email);
        }
        if (!oauthProviderEmailVerified()) {
          return false;
        }

        user.id = existing.id;
      } else if (isOAuth && oauthFlow === "signup") {
        const existing = user.id
          ? await db.user.findUnique({ where: { id: user.id }, select: userSelect })
          : await resolveUserByEmail(user.email);

        if (!existing) {
          return true;
        }
        if (existing.emailVerified) {
          user.id = existing.id;
        } else {
          return true;
        }
      } else if (!user?.id) {
        return false;
      }

      let dbUser: SignInUserRow | null = user.id
        ? await db.user.findUnique({
            where: { id: user.id },
            select: userSelect,
          })
        : null;

      let resolvedUserId = dbUser?.id ?? user.id;

      if (!dbUser) return false;
      if (isServiceBanned(dbUser)) return false;

      if (dbUser.deletedAt) {
        if (isAccountPastRecovery(dbUser)) return false;
        if (canRecoverAccount(dbUser)) {
          await recoverDeletedAccount(resolvedUserId);
        } else {
          return false;
        }
      }

      void recordUserDeviceFromRequest(resolvedUserId);

      if (account?.type !== "credentials") {
        const h = await headers();
        const isMobileOAuth = h.get("cookie")?.includes("mocomo_mobile_oauth=1");
        if (!isMobileOAuth) {
          void recordUserAccessLog({
            userId: resolvedUserId,
            username: user.username ?? undefined,
            email: user.email ?? undefined,
            success: true,
            channel: "web",
            provider: account?.provider ?? "oauth",
          });
        }
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user?.id && credentialsUserHasJwtFields(user)) {
        hydrateTokenFromCredentialsUser(
          token,
          user as {
            id: string;
            username?: string;
            role?: string;
            email?: string | null;
            premiumTier?: string;
            locale?: string;
            countryCode?: string;
            timeZone?: string;
            isBanned?: boolean;
            accountStatus?: string;
            isSuspendedReadOnly?: boolean;
            isOperator?: boolean;
            isStaff?: boolean;
          }
        );
        // credentials early-path에서도 isOperator/isStaff 세팅됨 — 오너면 DB role 보정
        if (token.isOperator && token.id) {
          void db.user
            .update({
              where: { id: String(token.id) },
              data: { role: "OWNER", adminDisabledAt: null, lastLoginAt: new Date() },
            })
            .catch(() => undefined);
        }
        return token;
      }

      if (user?.id) {
        token.id = user.id;
      }
      if (user?.id || trigger === "update") {
        const userId = (user?.id ?? token.id) as string;
        if (user?.id) {
          void db.user
            .update({
              where: { id: userId },
              data: { lastLoginAt: new Date() },
            })
            .catch(() => undefined);
        }
        const dbUser = await db.user.findUnique({
          where: { id: userId },
          select: {
            username: true,
            role: true,
            email: true,
            premiumTier: true,
            locale: true,
            countryCode: true,
            timeZone: true,
            isBanned: true,
            accountStatus: true,
            deletedAt: true,
            adminDisabledAt: true,
          },
        });
        if (dbUser) {
          token.username = dbUser.username;
          token.role = effectiveRole(dbUser);
          token.premiumTier = dbUser.premiumTier;
          token.locale = dbUser.locale;
          token.countryCode = dbUser.countryCode;
          token.timeZone = dbUser.timeZone;
          token.isBanned = isServiceBanned(dbUser);
          token.accountStatus = dbUser.accountStatus;
          token.isSuspendedReadOnly = isSuspendedReadOnly(dbUser);
          token.isDeleted = !!dbUser.deletedAt;
          token.isOperator = isOperatorIdentity({
            username: dbUser.username,
            role: effectiveRole(dbUser),
            email: dbUser.email,
          });
          token.isStaff = isStaffIdentity({
            username: dbUser.username,
            role: effectiveRole(dbUser),
            email: dbUser.email,
          });
          if (dbUser.adminDisabledAt && !token.isOperator) {
            token.isStaff = false;
            token.isOperator = false;
          }
          if (token.isOperator) {
            token.role = "OWNER";
            token.isStaff = true;
            if (dbUser.role !== "OWNER" || dbUser.adminDisabledAt) {
              void db.user
                .update({
                  where: { id: userId },
                  data: { role: "OWNER", adminDisabledAt: null },
                })
                .catch(() => undefined);
            }
          }
        }
      } else if (token.username && !token.isOperator && !token.isStaff) {
        // 기존 세션: username만으로 오너 플래그 복구 (재로그인 없이)
        const uname = String(token.username);
        if (isOperatorIdentity({ username: uname, role: String(token.role ?? "USER") })) {
          token.isOperator = true;
          token.isStaff = true;
          token.role = "OWNER";
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
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { profile: true, cosplayerProfile: true },
  });
  if (!user) return null;
  return hydrateUserOAuthProfile(user);
});

export async function getCurrentUser() {
  return getCachedCurrentUser();
}

export async function requireAuth(options?: { writeKind?: AccountWriteKind }) {
  const user = await getCachedCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  if (isServiceBanned(user)) throw new Error("BANNED");
  if (user.deletedAt) throw new Error("ACCOUNT_DELETED");
  assertAccountCanWrite(user, options?.writeKind ?? "default");
  return user;
}

/** Server Action — React cache() 없이 매 POST마다 세션·DB 재조회 */
export async function requireAuthForAction(options?: { writeKind?: AccountWriteKind }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("UNAUTHORIZED");

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      isBanned: true,
      accountStatus: true,
      deletedAt: true,
    },
  });
  if (!user) throw new Error("USER_NOT_FOUND");
  if (isServiceBanned(user)) throw new Error("BANNED");
  if (user.deletedAt) throw new Error("ACCOUNT_DELETED");
  assertAccountCanWrite(user, options?.writeKind ?? "default");
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
      accountStatus: true,
      deletedAt: true,
      role: true,
      supportTierSent: true,
    },
  });
});

export async function requireAuthMinimal(options?: { writeKind?: AccountWriteKind }) {
  const user = await getCachedAuthUserMinimal();
  if (!user) throw new Error("UNAUTHORIZED");
  if (isServiceBanned(user)) throw new Error("BANNED");
  if (user.deletedAt) throw new Error("ACCOUNT_DELETED");
  assertAccountCanWrite(user, options?.writeKind ?? "default");
  return user;
}

export async function requireAdmin(audit?: {
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}) {
  const user = await requireAuth();
  if (!isOperatorIdentity({ username: user.username, role: user.role, email: user.email })) {
    throw new Error("FORBIDDEN");
  }
  if (audit) {
    void logSiteAdminAudit({
      actorId: user.id,
      action: audit.action,
      targetType: audit.targetType,
      targetId: audit.targetId,
      metadata: audit.metadata,
    });
  }
  return user;
}

/** UI 표시용 — 환경 변수에 지정된 운영자 계정만 */
export function isSiteOperator(user: { username: string; role: string; email?: string | null }) {
  return isOperatorIdentity(user);
}
