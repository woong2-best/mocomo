import type { NextAuthConfig } from "next-auth";

/** Edge/middleware 전용 — DB·bcrypt·providers 없음 */
export const authConfig = {
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as string;
        session.user.premiumTier = token.premiumTier as string;
        session.user.level = token.level as number;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
