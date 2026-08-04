"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/admin/access";
import { logSiteAdminAudit } from "@/lib/site-admin-audit";
import { logVerification } from "@/lib/streaming-accounts/service";

export async function adminLoadStreamingAccounts(query: {
  q?: string;
  page?: number;
  verified?: "all" | "yes" | "no" | "revoked";
}) {
  try {
    await requireAdminPermission("live", { action: "DASHBOARD_VIEW" });
  } catch {
    return { ok: false as const, error: "권한이 없습니다." };
  }

  const page = Math.max(1, query.page ?? 1);
  const take = 30;
  const skip = (page - 1) * take;

  const where: {
    OR?: Array<
      | { channelName: { contains: string; mode: "insensitive" } }
      | { channelId: { contains: string; mode: "insensitive" } }
      | { user: { username: { contains: string; mode: "insensitive" } } }
    >;
    verified?: boolean;
    revokedAt?: { not: null } | null;
  } = {};

  const q = query.q?.trim();
  if (q) {
    where.OR = [
      { channelName: { contains: q, mode: "insensitive" } },
      { channelId: { contains: q, mode: "insensitive" } },
      { user: { username: { contains: q, mode: "insensitive" } } },
    ];
  }

  if (query.verified === "yes") {
    where.verified = true;
    where.revokedAt = null;
  } else if (query.verified === "no") {
    where.verified = false;
    where.revokedAt = null;
  } else if (query.verified === "revoked") {
    where.revokedAt = { not: null };
  }

  const [items, total] = await Promise.all([
    db.connectedStreamingAccount.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        platform: true,
        channelId: true,
        channelName: true,
        channelUrl: true,
        verified: true,
        verificationMethod: true,
        verifiedAt: true,
        revokedAt: true,
        revokedReason: true,
        createdAt: true,
        user: { select: { id: true, username: true } },
        _count: { select: { verificationLogs: true } },
      },
    }),
    db.connectedStreamingAccount.count({ where }),
  ]);

  return {
    ok: true as const,
    data: {
      items,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / take)),
    },
  };
}

export async function adminRevokeStreamingAccount(accountId: string, reason: string) {
  const admin = await requireAdminPermission("live", { action: "MODERATION_ACTION" });

  const account = await db.connectedStreamingAccount.findUnique({
    where: { id: accountId },
    select: { id: true, userId: true, channelName: true },
  });
  if (!account) return { error: "계정을 찾을 수 없습니다." };

  await db.connectedStreamingAccount.update({
    where: { id: accountId },
    data: {
      verified: false,
      revokedAt: new Date(),
      revokedReason: reason.trim().slice(0, 500) || "Admin revoked",
    },
  });

  await logVerification(accountId, "ADMIN_REVOKE", {
    method: "MANUAL_ADMIN",
    actorId: admin.id,
    detail: reason,
  });

  await logSiteAdminAudit({
    actorId: admin.id,
    action: "MODERATION_ACTION",
    targetType: "streaming_account",
    targetId: accountId,
    metadata: { reason, channelName: account.channelName },
  });

  revalidatePath("/admin/streaming-accounts");
  return { ok: true as const };
}

export async function adminDeleteStreamingAccount(accountId: string) {
  const admin = await requireAdminPermission("live", { action: "MODERATION_ACTION" });

  await db.connectedStreamingAccount.delete({ where: { id: accountId } }).catch(() => null);

  await logSiteAdminAudit({
    actorId: admin.id,
    action: "MODERATION_ACTION",
    targetType: "streaming_account",
    targetId: accountId,
    metadata: { action: "delete" },
  });

  revalidatePath("/admin/streaming-accounts");
  return { ok: true as const };
}

export async function adminLoadVerificationLogs(accountId: string, limit = 50) {
  await requireAdminPermission("live", { action: "DASHBOARD_VIEW" });

  const logs = await db.streamingAccountVerificationLog.findMany({
    where: { accountId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      action: true,
      method: true,
      success: true,
      detail: true,
      actorId: true,
      createdAt: true,
    },
  });

  return { ok: true as const, logs };
}

export async function adminBanUserForStreamingAbuse(userId: string, reason: string) {
  const admin = await requireAdminPermission("reports", { action: "USER_SUSPEND" });

  await db.user.update({
    where: { id: userId },
    data: {
      isBanned: true,
      banReason: reason.trim().slice(0, 500) || "Streaming account abuse",
      accountStatus: "BANNED",
    },
  });

  await db.connectedStreamingAccount.updateMany({
    where: { userId },
    data: {
      verified: false,
      revokedAt: new Date(),
      revokedReason: "User banned for streaming abuse",
    },
  });

  await logSiteAdminAudit({
    actorId: admin.id,
    action: "USER_SUSPEND",
    targetType: "user",
    targetId: userId,
    metadata: { reason, context: "streaming_abuse" },
  });

  revalidatePath("/admin/streaming-accounts");
  revalidatePath("/admin/users");
  return { ok: true as const };
}
