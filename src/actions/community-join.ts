"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { prismaErrorMessage } from "@/lib/prisma-user-error";
import { loadMemberPermissions } from "@/lib/community-server/member-permissions";
import { MAX_OWNERS } from "@/lib/community-server/rbac-defaults";
import type { JoinCommunityResult } from "@/lib/community-server/types";
import type { CommunityJoinMode } from "@prisma/client";
import {
  notifyCommunityJoin,
  notifyJoinApproved,
  notifyJoinRejected,
  notifyJoinRequestPending,
} from "@/lib/notifications";

async function addMemberToCommunity(
  communityId: string,
  userId: string,
  communitySlug: string,
  creatorId: string
) {
  await db.$transaction(async (tx) => {
    const member = await tx.communityMember.create({
      data: { communityId, userId, role: "member", presence: "ONLINE" },
    });
    await tx.community.update({
      where: { id: communityId },
      data: { memberCount: { increment: 1 } },
    });
    const defaultRole = await tx.communityRole.findFirst({
      where: { communityId, isDefault: true },
      select: { id: true },
    });
    if (defaultRole) {
      await tx.communityMemberRole.create({
        data: { memberId: member.id, roleId: defaultRole.id },
      });
    }

    const textChannels = await tx.communityChannel.findMany({
      where: { communityId, chatRoomId: { not: null } },
      select: { chatRoomId: true },
    });
    for (const ch of textChannels) {
      if (!ch.chatRoomId) continue;
      await tx.chatMember.upsert({
        where: { roomId_userId: { roomId: ch.chatRoomId, userId } },
        create: { roomId: ch.chatRoomId, userId, role: "member" },
        update: {},
      });
    }
  });

  revalidatePath(`/c/${communitySlug}`);
  revalidatePath("/communities");
}

export async function joinCommunityServer(
  communityId: string,
  inviteCode?: string
): Promise<JoinCommunityResult> {
  try {
    const user = await requireAuth();
    const community = await db.community.findUnique({
      where: { id: communityId },
      select: { id: true, slug: true, creatorId: true, joinMode: true, memberCount: true },
    });
    if (!community) return { error: "커뮤니티를 찾을 수 없습니다." };

    const banned = await db.communityBan.findUnique({
      where: { communityId_userId: { communityId, userId: user.id } },
    });
    if (banned && (!banned.expiresAt || banned.expiresAt > new Date())) {
      return { error: "이 커뮤니티에 참여할 수 없습니다." };
    }

    const existing = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId: user.id } },
      select: { id: true, welcomedAt: true },
    });
    if (existing) {
      const permissions = await loadMemberPermissions(
        communityId,
        user.id,
        community.creatorId === user.id
      );
      return {
        success: true,
        isMember: true,
        showWelcome: !existing.welcomedAt,
        memberCount: community.memberCount,
        permissions,
      };
    }

    if (community.joinMode === "INVITE_ONLY") {
      const code = inviteCode?.trim();
      if (!code) return { error: "초대 링크가 필요한 커뮤니티입니다." };
      const invite = await db.communityInvite.findFirst({
        where: { communityId, code },
      });
      if (!invite) return { error: "유효하지 않은 초대 링크입니다." };
      if (invite.expiresAt && invite.expiresAt < new Date()) {
        return { error: "만료된 초대 링크입니다." };
      }
      if (invite.maxUses != null && invite.useCount >= invite.maxUses) {
        return { error: "초대 링크 사용 횟수가 초과되었습니다." };
      }
      await db.communityInvite.update({
        where: { id: invite.id },
        data: { useCount: { increment: 1 } },
      });
    } else if (community.joinMode === "APPROVE") {
      await db.communityJoinRequest.upsert({
        where: { communityId_userId: { communityId, userId: user.id } },
        create: { communityId, userId: user.id, status: "PENDING" },
        update: { status: "PENDING", reviewedAt: null },
      });
      const mods = await db.communityMember.findMany({
        where: { communityId },
        select: { userId: true },
      });
      void notifyJoinRequestPending(
        communityId,
        community.slug,
        user.id,
        [community.creatorId, ...mods.map((m) => m.userId)]
      );
      return {
        success: true,
        pending: true,
        message: "가입 요청이 접수되었습니다. 승인 후 알림을 받게 됩니다.",
      };
    }

    await addMemberToCommunity(communityId, user.id, community.slug, community.creatorId);

    void notifyCommunityJoin(communityId, community.slug, community.creatorId, user.id);

    const permissions = await loadMemberPermissions(
      communityId,
      user.id,
      community.creatorId === user.id
    );

    return {
      success: true,
      isMember: true,
      showWelcome: true,
      memberCount: community.memberCount + 1,
      permissions,
    };
  } catch (e) {
    return { error: prismaErrorMessage(e) };
  }
}

export async function markCommunityWelcomeSeen(communityId: string) {
  try {
    const user = await requireAuth();
    await db.communityMember.updateMany({
      where: { communityId, userId: user.id, welcomedAt: null },
      data: { welcomedAt: new Date() },
    });
    return { success: true as const };
  } catch (e) {
    return { error: prismaErrorMessage(e) };
  }
}

export async function updateCommunityJoinMode(communityId: string, joinMode: CommunityJoinMode) {
  try {
    const user = await requireAuth();
    const community = await db.community.findUnique({
      where: { id: communityId },
      select: { creatorId: true, slug: true },
    });
    if (!community) return { error: "커뮤니티를 찾을 수 없습니다." };
    if (community.creatorId !== user.id) {
      const can = await loadMemberPermissions(communityId, user.id, false);
      if (!can.setJoinMode) return { error: "가입 방식 변경 권한이 없습니다." };
    }

    await db.community.update({
      where: { id: communityId },
      data: { joinMode },
    });
    revalidatePath(`/c/${community.slug}`);
    return { success: true as const };
  } catch (e) {
    return { error: prismaErrorMessage(e) };
  }
}

export async function createCommunityInvite(communityId: string) {
  try {
    const user = await requireAuth();
    const perms = await loadMemberPermissions(communityId, user.id, false);
    if (!perms.inviteMembers) return { error: "초대 권한이 없습니다." };

    const code = randomBytes(8).toString("hex");
    const invite = await db.communityInvite.create({
      data: { communityId, code, createdById: user.id },
      select: { code: true },
    });
    return { code: invite.code };
  } catch (e) {
    return { error: prismaErrorMessage(e) };
  }
}

export async function countCommunityOwners(communityId: string): Promise<number> {
  return db.communityMemberRole.count({
    where: { role: { communityId, type: "OWNER" } },
  });
}

export async function assertCanAssignOwner(communityId: string, memberId: string) {
  const currentOwners = await countCommunityOwners(communityId);
  const alreadyOwner = await db.communityMemberRole.findFirst({
    where: { memberId, role: { communityId, type: "OWNER" } },
  });
  if (!alreadyOwner && currentOwners >= MAX_OWNERS) {
    return { error: `Owner는 최대 ${MAX_OWNERS}명까지 지정할 수 있습니다.` };
  }
  return { ok: true as const };
}

export async function getCommunityJoinRequests(communityId: string) {
  try {
    const user = await requireAuth();
    const perms = await loadMemberPermissions(communityId, user.id, false);
    if (!perms.manageJoinRequests && !perms.approveMembers) {
      return { requests: [], error: "권한이 없습니다." };
    }

    const rows = await db.communityJoinRequest.findMany({
      where: { communityId, status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 50,
    });
    const users = await db.user.findMany({
      where: { id: { in: rows.map((r) => r.userId) } },
      select: { id: true, username: true, name: true, image: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));

    return {
      requests: rows.map((r) => {
        const u = byId.get(r.userId);
        return {
          id: r.id,
          userId: r.userId,
          username: u?.username ?? "unknown",
          name: u?.name ?? null,
          image: u?.image ?? null,
          message: r.message,
          createdAt: r.createdAt.toISOString(),
        };
      }),
    };
  } catch (e) {
    return { requests: [], error: prismaErrorMessage(e) };
  }
}

export async function reviewCommunityJoinRequest(
  requestId: string,
  action: "approve" | "reject"
) {
  try {
    const user = await requireAuth();
    const request = await db.communityJoinRequest.findUnique({
      where: { id: requestId },
      include: { community: { select: { id: true, slug: true, creatorId: true, memberCount: true } } },
    });
    if (!request || request.status !== "PENDING") {
      return { error: "요청을 찾을 수 없습니다." };
    }

    const perms = await loadMemberPermissions(request.communityId, user.id, false);
    if (!perms.manageJoinRequests && !perms.approveMembers) {
      return { error: "권한이 없습니다." };
    }

    if (action === "reject") {
      await db.communityJoinRequest.update({
        where: { id: requestId },
        data: { status: "REJECTED", reviewedAt: new Date() },
      });
      void notifyJoinRejected(request.community.slug, request.userId);
      revalidatePath(`/c/${request.community.slug}`);
      return { success: true as const };
    }

    const existing = await db.communityMember.findUnique({
      where: {
        communityId_userId: { communityId: request.communityId, userId: request.userId },
      },
    });
    if (!existing) {
      await addMemberToCommunity(
        request.communityId,
        request.userId,
        request.community.slug,
        request.community.creatorId
      );
      void notifyCommunityJoin(
        request.communityId,
        request.community.slug,
        request.community.creatorId,
        request.userId
      );
    }

    await db.communityJoinRequest.update({
      where: { id: requestId },
      data: { status: "APPROVED", reviewedAt: new Date() },
    });

    void notifyJoinApproved(request.community.slug, request.userId);

    revalidatePath(`/c/${request.community.slug}`);
    return { success: true as const };
  } catch (e) {
    return { error: prismaErrorMessage(e) };
  }
}
