"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { prismaErrorMessage } from "@/lib/prisma-user-error";
import { loadMemberPermissions } from "@/lib/community-server/member-permissions";
import { hasPermission } from "@/lib/community-server/permissions";

async function assertModPermission(
  communityId: string,
  userId: string,
  key: "kickMembers" | "banMembers" | "timeoutMembers"
) {
  const community = await db.community.findUnique({
    where: { id: communityId },
    select: { creatorId: true, slug: true },
  });
  if (!community) return { error: "커뮤니티를 찾을 수 없습니다." as const };
  const isOwner = community.creatorId === userId;
  const perms = await loadMemberPermissions(communityId, userId, isOwner);
  if (!hasPermission(perms, key)) {
    return { error: "권한이 없습니다." as const };
  }
  return { community, perms };
}

export async function kickCommunityMember(memberId: string) {
  try {
    const user = await requireAuth();
    const member = await db.communityMember.findUnique({
      where: { id: memberId },
      include: { community: { select: { id: true, slug: true, creatorId: true } } },
    });
    if (!member) return { error: "멤버를 찾을 수 없습니다." };
    if (member.userId === user.id) return { error: "자신을 추방할 수 없습니다." };
    if (member.community.creatorId === member.userId) {
      return { error: "커뮤니티 개설자는 추방할 수 없습니다." };
    }

    const gate = await assertModPermission(member.communityId, user.id, "kickMembers");
    if ("error" in gate) return gate;

    await db.$transaction([
      db.communityMember.delete({ where: { id: memberId } }),
      db.community.update({
        where: { id: member.communityId },
        data: { memberCount: { decrement: 1 } },
      }),
    ]);

    revalidatePath(`/c/${member.community.slug}`);
    return { success: true as const };
  } catch (e) {
    return { error: prismaErrorMessage(e) };
  }
}

export async function banCommunityMember(
  memberId: string,
  opts?: { reason?: string; minutes?: number; skipPermCheck?: boolean }
) {
  try {
    const user = await requireAuth();
    const member = await db.communityMember.findUnique({
      where: { id: memberId },
      include: { community: { select: { id: true, slug: true, creatorId: true } } },
    });
    if (!member) return { error: "멤버를 찾을 수 없습니다." };
    if (member.userId === user.id) return { error: "자신을 차단할 수 없습니다." };
    if (member.community.creatorId === member.userId) {
      return { error: "커뮤니티 개설자는 차단할 수 없습니다." };
    }

    if (!opts?.skipPermCheck) {
      const gate = await assertModPermission(member.communityId, user.id, "banMembers");
      if ("error" in gate) return gate;
    }

    const expiresAt =
      opts?.minutes && opts.minutes > 0
        ? new Date(Date.now() + opts.minutes * 60_000)
        : null;

    await db.$transaction(async (tx) => {
      await tx.communityBan.upsert({
        where: { communityId_userId: { communityId: member.communityId, userId: member.userId } },
        create: {
          communityId: member.communityId,
          userId: member.userId,
          reason: opts?.reason?.trim() || null,
          bannedById: user.id,
          expiresAt,
        },
        update: {
          reason: opts?.reason?.trim() || null,
          bannedById: user.id,
          expiresAt,
        },
      });
      const existing = await tx.communityMember.findUnique({ where: { id: memberId } });
      if (existing) {
        await tx.communityMember.delete({ where: { id: memberId } });
        await tx.community.update({
          where: { id: member.communityId },
          data: { memberCount: { decrement: 1 } },
        });
      }
    });

    revalidatePath(`/c/${member.community.slug}`);
    return { success: true as const };
  } catch (e) {
    return { error: prismaErrorMessage(e) };
  }
}

export async function timeoutCommunityMember(memberId: string, minutes: number) {
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 10_080) {
    return { error: "타임아웃은 1분~7일 사이로 설정해 주세요." };
  }
  try {
    const user = await requireAuth();
    const member = await db.communityMember.findUnique({
      where: { id: memberId },
      select: { communityId: true },
    });
    if (!member) return { error: "멤버를 찾을 수 없습니다." };
    const gate = await assertModPermission(member.communityId, user.id, "timeoutMembers");
    if ("error" in gate) return gate;
    return banCommunityMember(memberId, { reason: "타임아웃", minutes, skipPermCheck: true });
  } catch (e) {
    return { error: prismaErrorMessage(e) };
  }
}

export async function unbanCommunityMember(communityId: string, targetUserId: string) {
  try {
    const user = await requireAuth();
    const gate = await assertModPermission(communityId, user.id, "banMembers");
    if ("error" in gate) return gate;

    await db.communityBan.deleteMany({
      where: { communityId, userId: targetUserId },
    });
    revalidatePath(`/c/${gate.community.slug}`);
    return { success: true as const };
  } catch (e) {
    return { error: prismaErrorMessage(e) };
  }
}

export async function getCommunityBans(communityId: string) {
  try {
    const user = await requireAuth();
    const gate = await assertModPermission(communityId, user.id, "banMembers");
    if ("error" in gate) return { bans: [] };

    const rows = await db.communityBan.findMany({
      where: { communityId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const users = await db.user.findMany({
      where: { id: { in: rows.map((r) => r.userId) } },
      select: { id: true, username: true, image: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    return {
      bans: rows.map((r) => ({
        ...r,
        username: byId.get(r.userId)?.username ?? "unknown",
        image: byId.get(r.userId)?.image ?? null,
      })),
    };
  } catch {
    return { bans: [] };
  }
}
