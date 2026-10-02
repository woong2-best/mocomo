import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { after } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { requireAuthForAction } from "@/lib/auth";
import { prismaErrorMessage } from "@/lib/prisma-user-error";
import { loadMemberPermissions } from "@/lib/community-server/member-permissions";
import { MAX_OWNERS } from "@/lib/community-server/rbac-defaults";
import type { JoinCommunityResult } from "@/lib/community-server/types";
import type { CommunityJoinMode } from "@prisma/client";
import { COMMUNITIES_LIST_CACHE_TAG } from "@/lib/cache-tags";
import {
  notifyCommunityJoin,
  notifyJoinApproved,
  notifyJoinRejected,
  notifyJoinRequestPending,
} from "@/lib/notifications";
import {
  hashCommunityJoinPassword,
  isValidCommunityJoinPassword,
  verifyCommunityJoinPassword,
} from "@/lib/community-join-password";

function revalidateCommunityPaths(communitySlug: string) {
  // 응답 직후 재검증 — 페이지 재렌더 실패가 가입 성공 응답을 가로채지 않도록 함
  after(() => {
    try {
      revalidateTag(COMMUNITIES_LIST_CACHE_TAG);
    } catch (e) {
      console.error("[community-join] revalidateTag", e);
    }
    revalidatePath(`/c/${communitySlug}`);
    revalidatePath("/communities");
  });
}

async function addMemberToCommunity(
  communityId: string,
  userId: string,
  communitySlug: string,
  _creatorId: string
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
  });

  revalidateCommunityPaths(communitySlug);
}

export async function joinCommunityServer(
  communityId: string,
  inviteCode?: string,
  joinPassword?: string
): Promise<JoinCommunityResult> {
  try {
    const user = await requireAuthForAction();
    const community = await db.community.findUnique({
      where: { id: communityId },
      select: {
        id: true,
        slug: true,
        creatorId: true,
        joinMode: true,
        memberCount: true,
        joinPasswordHash: true,
      },
    });
    if (!community) return { error: t("actions.s1foa8q5") };

    const banned = await db.communityBan.findUnique({
      where: { communityId_userId: { communityId, userId: user.id } },
    });
    if (banned && (!banned.expiresAt || banned.expiresAt > new Date())) {
      return { error: t("actions.s1im9z4z") };
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

    if (community.joinPasswordHash) {
      const pin = joinPassword?.trim() ?? "";
      if (!isValidCommunityJoinPassword(pin)) {
        return { error: t("actions.s8e796l") };
      }
      const ok = await verifyCommunityJoinPassword(pin, community.joinPasswordHash);
      if (!ok) return { error: t("actions.sa72c6f") };
    }

    if (community.joinMode === "INVITE_ONLY") {
      const code = inviteCode?.trim();
      if (!code) return { error: t("actions.s107xdto") };
      const invite = await db.communityInvite.findFirst({
        where: { communityId, code },
      });
      if (!invite) return { error: t("actions.s1b8wpie") };
      if (invite.expiresAt && invite.expiresAt < new Date()) {
        return { error: t("actions.sz7t1p8") };
      }
      if (invite.maxUses != null && invite.useCount >= invite.maxUses) {
        return { error: t("actions.sm834fk") };
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
        message: t("actions.si3hw63"),
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
    const user = await requireAuthForAction();
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
    const user = await requireAuthForAction();
    const community = await db.community.findUnique({
      where: { id: communityId },
      select: { creatorId: true, slug: true },
    });
    if (!community) return { error: t("actions.s1foa8q5") };
    if (community.creatorId !== user.id) {
      const can = await loadMemberPermissions(communityId, user.id, false);
      if (!can.setJoinMode) return { error: t("actions.smlv0id") };
    }

    await db.community.update({
      where: { id: communityId },
      data: { joinMode },
    });
    revalidateCommunityPaths(community.slug);
    return { success: true as const };
  } catch (e) {
    return { error: prismaErrorMessage(e) };
  }
}

/** 방장(또는 setJoinMode 권한)이 4자리 가입 비밀번호를 설정/해제 */
export async function updateCommunityJoinPassword(
  communityId: string,
  password: string | null
): Promise<{ success: true } | { error: string }> {
  try {
    const user = await requireAuthForAction();
    const community = await db.community.findUnique({
      where: { id: communityId },
      select: { creatorId: true, slug: true },
    });
    if (!community) return { error: t("actions.s1foa8q5") };
    if (community.creatorId !== user.id) {
      const can = await loadMemberPermissions(communityId, user.id, false);
      if (!can.setJoinMode) return { error: t("actions.sxdufwd") };
    }

    if (password === null || password === "") {
      await db.community.update({
        where: { id: communityId },
        data: { joinPasswordHash: null },
      });
      revalidateCommunityPaths(community.slug);
      return { success: true as const };
    }

    const pin = password.trim();
    if (!isValidCommunityJoinPassword(pin)) {
      return { error: t("actions.skj7xjg") };
    }

    const joinPasswordHash = await hashCommunityJoinPassword(pin);
    await db.community.update({
      where: { id: communityId },
      data: { joinPasswordHash },
    });
    revalidateCommunityPaths(community.slug);
    return { success: true as const };
  } catch (e) {
    return { error: prismaErrorMessage(e) };
  }
}

export async function createCommunityInvite(communityId: string) {
  try {
    const user = await requireAuthForAction();
    const perms = await loadMemberPermissions(communityId, user.id, false);
    if (!perms.inviteMembers) return { error: t("actions.sozb6fz") };

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
    return { error: t("actions.owner", { v0: MAX_OWNERS }) };
  }
  return { ok: true as const };
}

export async function getCommunityJoinRequests(communityId: string) {
  try {
    const user = await requireAuthForAction();
    const perms = await loadMemberPermissions(communityId, user.id, false);
    if (!perms.manageJoinRequests && !perms.approveMembers) {
      return { requests: [], error: t("actions.st3onev") };
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
    const user = await requireAuthForAction();
    const request = await db.communityJoinRequest.findUnique({
      where: { id: requestId },
      include: { community: { select: { id: true, slug: true, creatorId: true, memberCount: true } } },
    });
    if (!request || request.status !== "PENDING") {
      return { error: t("actions.s16gsg46") };
    }

    const perms = await loadMemberPermissions(request.communityId, user.id, false);
    if (!perms.manageJoinRequests && !perms.approveMembers) {
      return { error: t("actions.st3onev") };
    }

    if (action === "reject") {
      await db.communityJoinRequest.update({
        where: { id: requestId },
        data: { status: "REJECTED", reviewedAt: new Date() },
      });
      void notifyJoinRejected(request.community.slug, request.userId);
      revalidateCommunityPaths(request.community.slug);
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

    revalidateCommunityPaths(request.community.slug);
    return { success: true as const };
  } catch (e) {
    return { error: prismaErrorMessage(e) };
  }
}
