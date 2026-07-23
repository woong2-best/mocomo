import type { NextAuthConfig } from "next-auth";
import { getAuthSecret } from "@/lib/auth-env";

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
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as string;
        session.user.premiumTier = token.premiumTier as string;
        session.user.level = token.level as number;
        session.user.locale = token.locale as string;
        session.user.countryCode = token.countryCode as string;
        session.user.timeZone = token.timeZone as string;
        session.user.isBanned = Boolean(token.isBanned);
        session.user.accountStatus = token.accountStatus as string | undefined;
        session.user.isSuspendedReadOnly = Boolean(token.isSuspendedReadOnly);
        session.user.isDeleted = Boolean(token.isDeleted);
        session.user.isOperator = Boolean(token.isOperator);
        session.user.isStaff = Boolean(token.isStaff);
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
