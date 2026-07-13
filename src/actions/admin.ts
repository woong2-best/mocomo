"use server";

import { revalidatePath } from "next/cache";
import type { AccountStatus, ReportStatus, ReportTargetType } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { COMMUNITY_FEED_PATH } from "@/lib/site-routes";

async function logSuspensionChange(params: {
  userId: string;
  actorId: string;
  previousStatus: AccountStatus;
  newStatus: AccountStatus;
  reason?: string;
  isPermanent?: boolean;
  metadata?: Record<string, unknown>;
}) {
  await Promise.all([
    db.accountSuspensionLog.create({
      data: {
        userId: params.userId,
        actorId: params.actorId,
        previousStatus: params.previousStatus,
        newStatus: params.newStatus,
        reason: params.reason,
        isPermanent: params.isPermanent ?? false,
        metadata: params.metadata ? (params.metadata as object) : undefined,
      },
    }),
    db.modLog.create({
      data: {
        actorId: params.actorId,
        targetId: params.userId,
        action: `account_status_${params.newStatus.toLowerCase()}`,
        reason: params.reason,
        metadata: params.metadata ? (params.metadata as object) : undefined,
      },
    }),
  ]);
}

export async function suspendUserPermanently(targetId: string, reason: string) {
  const admin = await requireAdmin();
  const target = await db.user.findUnique({
    where: { id: targetId },
    select: { accountStatus: true },
  });
  if (!target) return { error: "사용자를 찾을 수 없습니다." };

  await db.user.update({
    where: { id: targetId },
    data: {
      accountStatus: "PERMANENT_SUSPENDED",
      isBanned: false,
      suspensionReason: reason,
      suspendedAt: new Date(),
      suspendedById: admin.id,
      suspensionExpiresAt: null,
      banReason: null,
      bannedUntil: null,
    },
  });

  await logSuspensionChange({
    userId: targetId,
    actorId: admin.id,
    previousStatus: target.accountStatus,
    newStatus: "PERMANENT_SUSPENDED",
    reason,
    isPermanent: true,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/suspensions");
  return { success: true };
}

export async function suspendUserTemporary(targetId: string, reason: string, until: Date) {
  const admin = await requireAdmin();
  const target = await db.user.findUnique({
    where: { id: targetId },
    select: { accountStatus: true },
  });
  if (!target) return { error: "사용자를 찾을 수 없습니다." };

  await db.user.update({
    where: { id: targetId },
    data: {
      accountStatus: "TEMP_SUSPENDED",
      isBanned: false,
      suspensionReason: reason,
      suspendedAt: new Date(),
      suspendedById: admin.id,
      suspensionExpiresAt: until,
      banReason: null,
      bannedUntil: null,
    },
  });

  await logSuspensionChange({
    userId: targetId,
    actorId: admin.id,
    previousStatus: target.accountStatus,
    newStatus: "TEMP_SUSPENDED",
    reason,
    metadata: { until: until.toISOString() },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/suspensions");
  return { success: true };
}

export async function restoreUserAccount(targetId: string, note?: string) {
  const admin = await requireAdmin();
  const target = await db.user.findUnique({
    where: { id: targetId },
    select: { accountStatus: true },
  });
  if (!target) return { error: "사용자를 찾을 수 없습니다." };

  await db.user.update({
    where: { id: targetId },
    data: {
      accountStatus: "ACTIVE",
      isBanned: false,
      suspensionReason: null,
      suspendedAt: null,
      suspendedById: null,
      suspensionExpiresAt: null,
      banReason: null,
      bannedUntil: null,
    },
  });

  await logSuspensionChange({
    userId: targetId,
    actorId: admin.id,
    previousStatus: target.accountStatus,
    newStatus: "ACTIVE",
    reason: note ?? "관리자 복구",
  });

  revalidatePath("/admin");
  revalidatePath("/admin/suspensions");
  return { success: true };
}

export async function banUser(targetId: string, reason: string, until?: Date) {
  const admin = await requireAdmin();
  const target = await db.user.findUnique({
    where: { id: targetId },
    select: { accountStatus: true },
  });
  if (!target) return { error: "사용자를 찾을 수 없습니다." };

  await db.user.update({
    where: { id: targetId },
    data: {
      isBanned: true,
      accountStatus: "BANNED",
      banReason: reason,
      bannedUntil: until,
      suspensionReason: reason,
      suspendedAt: new Date(),
      suspendedById: admin.id,
    },
  });

  await logSuspensionChange({
    userId: targetId,
    actorId: admin.id,
    previousStatus: target.accountStatus,
    newStatus: "BANNED",
    reason,
    isPermanent: !until,
    metadata: until ? { until: until.toISOString() } : undefined,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/suspensions");
  return { success: true };
}

export async function unbanUser(targetId: string) {
  return restoreUserAccount(targetId, "이용 금지 해제");
}

export async function resolveReport(reportId: string, status: ReportStatus) {
  const admin = await requireAdmin();
  await db.report.update({ where: { id: reportId }, data: { status } });
  await db.modLog.create({
    data: { actorId: admin.id, targetId: reportId, action: "resolve_report", metadata: { status } },
  });
  revalidatePath("/admin");
  return { success: true };
}

export async function getAdminStats() {
  await requireAdmin();
  const [users, posts, reports, tips] = await Promise.all([
    db.user.count(),
    db.post.count(),
    db.report.count({ where: { status: "PENDING" } }),
    db.tip.aggregate({ _sum: { amount: true } }),
  ]);
  return {
    users,
    posts,
    pendingReports: reports,
    totalTips: tips._sum.amount ?? 0,
  };
}

export async function searchSuspendedUsers(query: string) {
  await requireAdmin();
  const q = query.trim();
  if (!q) {
    return db.user.findMany({
      where: {
        OR: [
          { accountStatus: { in: ["READ_ONLY", "TEMP_SUSPENDED", "PERMANENT_SUSPENDED", "BANNED"] } },
          { isBanned: true },
        ],
      },
      orderBy: { suspendedAt: "desc" },
      take: 30,
      select: {
        id: true,
        username: true,
        email: true,
        accountStatus: true,
        suspensionReason: true,
        suspendedAt: true,
        isBanned: true,
      },
    });
  }

  return db.user.findMany({
    where: {
      AND: [
        {
          OR: [
            { username: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { id: q },
          ],
        },
        {
          OR: [
            { accountStatus: { not: "ACTIVE" } },
            { isBanned: true },
          ],
        },
      ],
    },
    take: 30,
    select: {
      id: true,
      username: true,
      email: true,
      accountStatus: true,
      suspensionReason: true,
      suspendedAt: true,
      isBanned: true,
    },
  });
}

export async function getPendingReports() {
  await requireAdmin();
  return db.report.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      reporter: { select: { username: true } },
      post: { select: { id: true, title: true, content: true, authorId: true } },
      reportedUser: { select: { id: true, username: true } },
    },
  });
}

export async function adminForceDeletePost(postId: string, modReason?: string) {
  const admin = await requireAdmin();
  const post = await db.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, title: true },
  });
  if (!post) return { error: "게시물을 찾을 수 없습니다." };

  await db.post.delete({ where: { id: postId } });
  await db.modLog.create({
    data: {
      actorId: admin.id,
      targetId: post.authorId,
      action: "force_delete_post",
      reason: modReason ?? "관리자 강제 삭제",
      metadata: { postId, title: post.title },
    },
  });

  revalidatePath(COMMUNITY_FEED_PATH);
  revalidatePath("/admin");
  revalidatePath(`/post/${postId}`);
  return { success: true };
}

export async function adminForceDeleteUsedListing(listingId: string, modReason?: string) {
  const admin = await requireAdmin();
  const listing = await db.usedListing.findUnique({
    where: { id: listingId },
    select: { id: true, sellerId: true, title: true },
  });
  if (!listing) return { error: "중고 글을 찾을 수 없습니다." };

  await db.usedListing.delete({ where: { id: listingId } });
  await db.modLog.create({
    data: {
      actorId: admin.id,
      targetId: listing.sellerId,
      action: "force_delete_used_listing",
      reason: modReason ?? "관리자 강제 삭제",
      metadata: { listingId, title: listing.title },
    },
  });

  revalidatePath("/used");
  revalidatePath("/admin");
  revalidatePath(`/used/${listingId}`);
  return { success: true };
}

export async function adminForceDeleteByReport(
  reportId: string,
  targetType: ReportTargetType,
  targetId: string
) {
  const admin = await requireAdmin();
  let result: { error?: string; success?: boolean };

  if (targetType === "POST") {
    result = await adminForceDeletePost(targetId, "신고 처리 — 게시물 삭제");
  } else if (targetType === "USED_LISTING") {
    result = await adminForceDeleteUsedListing(targetId, "신고 처리 — 중고 글 삭제");
  } else if (targetType === "LIVE_CHAT") {
    await db.liveChatMessage.deleteMany({ where: { id: targetId } });
    result = { success: true };
  } else if (targetType === "LIVE_CHANNEL") {
    await db.voiceChannel.update({
      where: { id: targetId },
      data: { isLive: false, liveStatus: "ENDED", endedAt: new Date() },
    });
    await db.voiceMember.deleteMany({ where: { channelId: targetId } });
    result = { success: true };
  } else {
    return { error: "이 유형은 자동 삭제를 지원하지 않습니다. 유저 정지 등 다른 조치를 사용해 주세요." };
  }

  if (result.error) return result;

  await db.report.update({
    where: { id: reportId },
    data: { status: "RESOLVED" },
  });
  await db.modLog.create({
    data: {
      actorId: admin.id,
      targetId: reportId,
      action: "resolve_report_delete",
      metadata: { targetType, targetId },
    },
  });
  revalidatePath("/admin");
  return { success: true };
}
