import { db } from "@/lib/db";
import { suspensionBlocksSignup } from "@/lib/account-status";

export async function findRestrictedIdentityUser(params: {
  email?: string | null;
  phone?: string | null;
  oauthProvider?: string;
  oauthProviderAccountId?: string;
  excludeUserId?: string;
}) {
  const email = params.email?.trim().toLowerCase();
  if (email) {
    const byEmail = await db.user.findFirst({
      where: {
        email,
        ...(params.excludeUserId ? { id: { not: params.excludeUserId } } : {}),
      },
      select: {
        id: true,
        username: true,
        isBanned: true,
        accountStatus: true,
      },
    });
    if (byEmail && suspensionBlocksSignup(byEmail.accountStatus, byEmail.isBanned)) {
      return { user: byEmail, matchType: "email" as const };
    }
  }

  const phone = params.phone?.trim();
  if (phone) {
    const byPhone = await db.user.findFirst({
      where: {
        phone,
        ...(params.excludeUserId ? { id: { not: params.excludeUserId } } : {}),
      },
      select: {
        id: true,
        username: true,
        isBanned: true,
        accountStatus: true,
      },
    });
    if (byPhone && suspensionBlocksSignup(byPhone.accountStatus, byPhone.isBanned)) {
      return { user: byPhone, matchType: "phone" as const };
    }
  }

  if (params.oauthProvider && params.oauthProviderAccountId) {
    const account = await db.account.findFirst({
      where: {
        provider: params.oauthProvider,
        providerAccountId: params.oauthProviderAccountId,
      },
      select: { userId: true },
    });
    if (account?.userId && account.userId !== params.excludeUserId) {
      const linked = await db.user.findUnique({
        where: { id: account.userId },
        select: {
          id: true,
          username: true,
          isBanned: true,
          accountStatus: true,
        },
      });
      if (linked && suspensionBlocksSignup(linked.accountStatus, linked.isBanned)) {
        return { user: linked, matchType: "oauth" as const };
      }
    }
  }

  return null;
}

export async function recordBanEvasionSuspect(params: {
  newUserId: string;
  linkedUserId: string;
  matchType: string;
  metadata?: Record<string, unknown>;
}) {
  const existing = await db.banEvasionSuspect.findFirst({
    where: {
      userId: params.newUserId,
      linkedUserId: params.linkedUserId,
      matchType: params.matchType,
      reviewed: false,
    },
  });
  if (existing) return existing;

  return db.banEvasionSuspect.create({
    data: {
      userId: params.newUserId,
      linkedUserId: params.linkedUserId,
      matchType: params.matchType,
      metadata: params.metadata ? (params.metadata as object) : undefined,
    },
  });
}
