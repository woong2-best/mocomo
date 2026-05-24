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
          select: { username: true, role: true, premiumTier: true, level: true },
        });
        if (dbUser) {
          token.username = dbUser.username;
          token.role = dbUser.role;
          token.premiumTier = dbUser.premiumTier;
          token.level = dbUser.level;
        }
      }
      return token;
    },
  },
});

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return db.user.findUnique({
    where: { id: session.user.id },
    include: { profile: true, cosplayerProfile: true },
  });
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  if (user.isBanned) throw new Error("BANNED");
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== "ADMIN" && user.role !== "MODERATOR") throw new Error("FORBIDDEN");
  return user;
}
