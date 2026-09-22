import type { NextAuthConfig } from "next-auth";
import { getAuthSecret } from "@/lib/auth-env";
import { applyAdminWebSessionLifetime } from "@/lib/admin/web-session-ttl";

/** Edge/middleware 전용 — DB·bcrypt·providers 없음 */
export const authConfig = {
  trustHost: true,
  secret: getAuthSecret(),
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  providers: [],
  callbacks: {
    /**
     * Edge middleware는 이 설정만 쓴다. 매 요청 JWT를 다시 서명하므로
     * 관리자 1시간 만료는 여기서 폐기해야 쿠키가 30일로 되살아나지 않는다.
     */
    async jwt({ token, user, trigger }) {
      return applyAdminWebSessionLifetime(token, {
        isNewLogin: Boolean(user) || trigger === "signIn",
      });
    },
    redirect({ url, baseUrl }) {
      // App deep links from mobile OAuth pending-signup / complete.
      if (
        url.startsWith("mocomo:") ||
        url.startsWith("exp:") ||
        url.startsWith("exps:")
      ) {
        return url;
      }
      // Relative auth paths (signup / oauth complete / mobile handoff).
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const target = new URL(url);
        const base = new URL(baseUrl);
        // Same host — keep full URL (query strings matter for mobile handoff).
        if (target.origin === base.origin) return url;
        // AUTH_URL / VERCEL_URL mismatch used to fall through to site home and
        // dump AuthSession users out of the app OAuth bridge.
        if (
          target.pathname.startsWith("/auth/signup") ||
          target.pathname.startsWith("/auth/oauth/complete") ||
          target.pathname.startsWith("/auth/mobile/")
        ) {
          return `${base.origin}${target.pathname}${target.search}${target.hash}`;
        }
      } catch {
        /* ignore */
      }
      return baseUrl;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as string;
        session.user.premiumTier = token.premiumTier as string;
        session.user.locale = token.locale as string;
        session.user.countryCode = token.countryCode as string;
        session.user.timeZone = token.timeZone as string;
        session.user.isBanned = Boolean(token.isBanned);
        session.user.accountStatus = token.accountStatus as string | undefined;
        session.user.isSuspendedReadOnly = Boolean(token.isSuspendedReadOnly);
        session.user.isDeleted = Boolean(token.isDeleted);
        session.user.isOperator = Boolean(token.isOperator);
        session.user.isStaff = Boolean(token.isStaff);
        const adminStarted = Number(token.adminSessionStartedAt);
        if (
          (token.isStaff || token.isOperator) &&
          Number.isFinite(adminStarted) &&
          adminStarted > 0
        ) {
          session.user.adminSessionStartedAt = adminStarted;
        }
        session.user.supportTierSent = token.supportTierSent;
        session.user.earnedMocoTier = token.earnedMocoTier;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
