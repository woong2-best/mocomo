"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { prismaErrorMessage } from "@/lib/prisma-user-error";
import { loadMemberPermissions } from "@/lib/community-server/member-permissions";
import { hasPermission } from "@/lib/community-server/permissions";
import { logCommunityAudit } from "@/lib/community-server/audit-log";

async function modPerms(communityId: string, userId: string) {
  const community = await db.community.findUnique({
    where: { id: communityId },
    select: { creatorId: true, slug: true },
  });
  if (!community) return null;
  const isOwner = community.creatorId === userId;
  const perms = await loadMemberPermissions(communityId, userId, isOwner);
  return { community, perms, isOwner };
}

export async function deleteCommunityPost(postId: string, communityId: string) {
  try {
    const user = await requireAuth();
    const ctx = await modPerms(communityId, user.id);
    if (!ctx) return { error: "커뮤니티를 찾을 수 없습니다." };
    if (!hasPermission(ctx.perms, "deletePosts")) return { error: "권한이 없습니다." };

    const post = await db.post.findFirst({
      where: { id: postId, communityId },
      select: { id: true, authorId: true },
    });
    if (!post) return { error: "게시글을 찾을 수 없습니다." };

    await db.post.delete({ where: { id: postId } });
    void logCommunityAudit({
      communityId,
      actorId: user.id,
      action: "DELETE_POST",
      targetType: "post",
      targetId: postId,
    });
    revalidatePath(`/c/${ctx.community.slug}`);
    return { success: true as const };
  } catch (e) {
    return { error: prismaErrorMessage(e) };
  }
}

export async function pinCommunityPost(postId: string, communityId: string, pinned: boolean) {
  try {
    const user = await requireAuth();
    const ctx = await modPerms(communityId, user.id);
    if (!ctx) return { error: "커뮤니티를 찾을 수 없습니다." };
    if (!hasPermission(ctx.perms, "announce") && !hasPermission(ctx.perms, "pinMessages")) {
      return { error: "권한이 없습니다." };
    }

    await db.post.updateMany({
      where: { id: postId, communityId },
      data: { isPinned: pinned },
    });
    void logCommunityAudit({
      communityId,
      actorId: user.id,
      action: pinned ? "PIN_POST" : "UNPIN_POST",
      targetType: "post",
      targetId: postId,
    });
    revalidatePath(`/c/${ctx.community.slug}`);
    return { success: true as const };
  } catch (e) {
    return { error: prismaErrorMessage(e) };
  }
}

export async function deleteCommunityComment(commentId: string, communityId: string) {
  try {
    const user = await requireAuth();
    const ctx = await modPerms(communityId, user.id);
    if (!ctx) return { error: "커뮤니티를 찾을 수 없습니다." };
    if (!hasPermission(ctx.perms, "deleteComments")) return { error: "권한이 없습니다." };

    const comment = await db.comment.findFirst({
      where: { id: commentId, post: { communityId } },
      select: { id: true },
    });
    if (!comment) return { error: "댓글을 찾을 수 없습니다." };

    await db.comment.delete({ where: { id: commentId } });
    void logCommunityAudit({
      communityId,
      actorId: user.id,
      action: "DELETE_COMMENT",
      targetType: "comment",
      targetId: commentId,
    });
    revalidatePath(`/c/${ctx.community.slug}`);
    return { success: true as const };
  } catch (e) {
    return { error: prismaErrorMessage(e) };
  }
}

export async function deleteCommunityChatMessage(messageId: string, communityId: string) {
  try {
    const user = await requireAuth();
    const ctx = await modPerms(communityId, user.id);
    if (!ctx) return { error: "커뮤니티를 찾을 수 없습니다." };
    if (!hasPermission(ctx.perms, "deleteMessages")) return { error: "권한이 없습니다." };

    const msg = await db.message.findFirst({
      where: {
        id: messageId,
        room: { communityId },
      },
      select: { id: true, roomId: true },
    });
    if (!msg) return { error: "메시지를 찾을 수 없습니다." };

    await db.message.delete({ where: { id: messageId } });
    void logCommunityAudit({
      communityId,
      actorId: user.id,
      action: "DELETE_MESSAGE",
      targetType: "message",
      targetId: messageId,
    });
    revalidatePath(`/c/${ctx.community.slug}`);
    return { success: true as const, roomId: msg.roomId };
  } catch (e) {
    return { error: prismaErrorMessage(e) };
  }
}

export async function getCommunityReports(communityId: string) {
  try {
    const user = await requireAuth();
    const ctx = await modPerms(communityId, user.id);
    if (!ctx || !hasPermission(ctx.perms, "handleReports")) return { reports: [] };

    const memberIds = await db.communityMember.findMany({
      where: { communityId },
      select: { userId: true },
    });
    const userIds = memberIds.map((m) => m.userId);

    const postIds = (
      await db.post.findMany({
        where: { communityId },
        select: { id: true },
        take: 500,
      })
    ).map((p) => p.id);

    const reports = await db.report.findMany({
      where: {
        status: "PENDING",
        OR: [
          { reportedUserId: { in: userIds } },
          { postId: { in: postIds } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        reporter: { select: { username: true } },
      },
    });

    return {
      reports: reports.map((r) => ({
        id: r.id,
        targetType: r.targetType,
        targetId: r.targetId,
        reason: r.reason,
        createdAt: r.createdAt.toISOString(),
        reporterUsername: r.reporter?.username ?? "unknown",
      })),
    };
  } catch {
    return { reports: [] };
  }
}

export async function resolveCommunityReport(
  reportId: string,
  communityId: string,
  status: "RESOLVED" | "DISMISSED"
) {
  try {
    const user = await requireAuth();
    const ctx = await modPerms(communityId, user.id);
    if (!ctx || !hasPermission(ctx.perms, "handleReports")) {
      return { error: "권한이 없습니다." };
    }

    await db.report.update({
      where: { id: reportId },
      data: { status },
    });
    void logCommunityAudit({
      communityId,
      actorId: user.id,
      action: `REPORT_${status}`,
      targetType: "report",
      targetId: reportId,
    });
    return { success: true as const };
  } catch (e) {
    return { error: prismaErrorMessage(e) };
  }
}

export async function getCommunityStats(communityId: string) {
  try {
    const user = await requireAuth();
    const ctx = await modPerms(communityId, user.id);
    if (!ctx || !hasPermission(ctx.perms, "viewStats")) return { stats: null };

    const [memberCount, postCount, channelCount, pendingReports, pendingJoins] =
      await Promise.all([
        db.communityMember.count({ where: { communityId } }),
        db.post.count({ where: { communityId } }),
        db.communityChannel.count({ where: { communityId } }),
        db.report.count({
          where: { status: "PENDING" },
        }),
        db.communityJoinRequest.count({
          where: { communityId, status: "PENDING" },
        }),
      ]);

    return {
      stats: { memberCount, postCount, channelCount, pendingReports, pendingJoins },
    };
  } catch {
    return { stats: null };
  }
}

export async function getCommunityAuditLogs(communityId: string, take = 30) {
  try {
    const user = await requireAuth();
    const ctx = await modPerms(communityId, user.id);
    if (!ctx || !hasPermission(ctx.perms, "viewAuditLog")) return { logs: [] };

    const logs = await db.communityAuditLog.findMany({
      where: { communityId },
      orderBy: { createdAt: "desc" },
      take,
    });
    const actors = await db.user.findMany({
      where: { id: { in: [...new Set(logs.map((l) => l.actorId))] } },
      select: { id: true, username: true },
    });
    const byId = new Map(actors.map((a) => [a.id, a.username]));

    return {
      logs: logs.map((l) => ({
        ...l,
        actorUsername: byId.get(l.actorId) ?? "unknown",
        createdAt: l.createdAt.toISOString(),
      })),
    };
  } catch {
    return { logs: [] };
  }
}

export async function getCommunityFiles(communityId: string) {
  try {
    const roomIds = (
      await db.communityChannel.findMany({
        where: { communityId, chatRoomId: { not: null } },
        select: { chatRoomId: true },
      })
    )
      .map((c) => c.chatRoomId)
      .filter(Boolean) as string[];

    const attachments = await db.messageAttachment.findMany({
      where: {
        message: { roomId: { in: roomIds } },
        type: { in: ["FILE", "IMAGE", "VIDEO", "AUDIO"] },
      },
      orderBy: { message: { createdAt: "desc" } },
      take: 50,
      include: {
        message: {
          select: {
            sender: { select: { username: true } },
            createdAt: true,
          },
        },
      },
    });

    return {
      files: attachments.map((a) => ({
        id: a.id,
        url: a.url,
        name: a.name,
        type: a.type,
        username: a.message.sender.username,
        createdAt: a.message.createdAt.toISOString(),
      })),
    };
  } catch {
    return { files: [] };
  }
}
