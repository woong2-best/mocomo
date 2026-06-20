"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ReportStatus, type ReportTargetType } from "@prisma/client";
import { COMMUNITY_FEED_PATH } from "@/lib/site-routes";

export async function banUser(targetId: string, reason: string, until?: Date) {
  const admin = await requireAdmin();
  await db.user.update({
    where: { id: targetId },
    data: { isBanned: true, banReason: reason, bannedUntil: until },
  });
  await db.modLog.create({
    data: { actorId: admin.id, targetId, action: "ban", reason },
  });
  revalidatePath("/admin");
  return { success: true };
}

export async function unbanUser(targetId: string) {
  const admin = await requireAdmin();
  await db.user.update({
    where: { id: targetId },
    data: { isBanned: false, banReason: null, bannedUntil: null },
  });
  await db.modLog.create({
    data: { actorId: admin.id, targetId, action: "unban" },
  });
  return { success: true };
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
