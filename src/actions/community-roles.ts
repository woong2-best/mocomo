"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { defaultPermissionsForRole, hasPermission, parsePermissions } from "@/lib/community-server/permissions";
import type { CommunityPermissionKey } from "@/lib/community-server/types";
import { prismaErrorMessage } from "@/lib/prisma-user-error";
import type { CommunityRoleType } from "@prisma/client";

async function canManageRoles(communityId: string, userId: string): Promise<boolean> {
  const community = await db.community.findUnique({
    where: { id: communityId },
    select: { creatorId: true },
  });
  if (!community) return false;
  if (community.creatorId === userId) return true;

  const member = await db.communityMember.findUnique({
    where: { communityId_userId: { communityId, userId } },
    include: { memberRoles: { include: { role: true } } },
  });
  if (!member) return false;
  const perms = member.memberRoles.map((mr) => parsePermissions(mr.role.permissions));
  return perms.some((p) => p.manageRoles);
}

export async function getCommunityRoles(communityId: string) {
  const roles = await db.communityRole.findMany({
    where: { communityId },
    orderBy: { position: "asc" },
    select: {
      id: true,
      name: true,
      type: true,
      color: true,
      position: true,
      permissions: true,
      isDefault: true,
      _count: { select: { members: true } },
    },
  });
  return roles.map((r) => ({
    ...r,
    permissions: parsePermissions(r.permissions),
    memberCount: r._count.members,
  }));
}

export async function updateRolePermissions(
  roleId: string,
  permissions: Partial<Record<CommunityPermissionKey, boolean>>
) {
  try {
    const user = await requireAuth();
    const role = await db.communityRole.findUnique({
      where: { id: roleId },
      include: { community: { select: { slug: true } } },
    });
    if (!role) return { error: "역할을 찾을 수 없습니다." };
    if (role.type === "OWNER") return { error: "Owner 역할은 수정할 수 없습니다." };
    if (!(await canManageRoles(role.communityId, user.id))) {
      return { error: "역할 관리 권한이 없습니다." };
    }

    const current = parsePermissions(role.permissions);
    const next = { ...current, ...permissions };

    await db.communityRole.update({
      where: { id: roleId },
      data: { permissions: next },
    });

    revalidatePath(`/c/${role.community.slug}`);
    return { success: true as const };
  } catch (e) {
    return { error: prismaErrorMessage(e) };
  }
}

export async function assignMemberRole(memberId: string, roleId: string) {
  try {
    const user = await requireAuth();
    const member = await db.communityMember.findUnique({
      where: { id: memberId },
      include: { community: { select: { id: true, slug: true, creatorId: true } } },
    });
    if (!member) return { error: "멤버를 찾을 수 없습니다." };
    if (!(await canManageRoles(member.communityId, user.id))) {
      return { error: "역할 관리 권한이 없습니다." };
    }

    const role = await db.communityRole.findUnique({ where: { id: roleId } });
    if (!role || role.communityId !== member.communityId) {
      return { error: "역할을 찾을 수 없습니다." };
    }

    await db.communityMemberRole.upsert({
      where: { memberId_roleId: { memberId, roleId } },
      create: { memberId, roleId },
      update: {},
    });

    revalidatePath(`/c/${member.community.slug}`);
    return { success: true as const };
  } catch (e) {
    return { error: prismaErrorMessage(e) };
  }
}

export async function createCommunityRole(data: {
  communityId: string;
  name: string;
  type: CommunityRoleType;
  color?: string;
}) {
  try {
    const user = await requireAuth();
    if (!(await canManageRoles(data.communityId, user.id))) {
      return { error: "역할 관리 권한이 없습니다." };
    }

    const name = data.name.trim();
    if (!name) return { error: "역할 이름을 입력해 주세요." };

    const maxPos = await db.communityRole.aggregate({
      where: { communityId: data.communityId },
      _max: { position: true },
    });

    const community = await db.community.findUnique({
      where: { id: data.communityId },
      select: { slug: true },
    });

    const role = await db.communityRole.create({
      data: {
        communityId: data.communityId,
        name,
        type: data.type,
        color: data.color ?? "#94a3b8",
        position: (maxPos._max.position ?? 0) + 1,
        permissions: defaultPermissionsForRole(data.type),
      },
      select: { id: true, name: true },
    });

    if (community) revalidatePath(`/c/${community.slug}`);
    return { role };
  } catch (e) {
    return { error: prismaErrorMessage(e) };
  }
}

export async function checkCommunityPermission(
  communityId: string,
  permission: CommunityPermissionKey
): Promise<boolean> {
  const user = await requireAuth();
  const community = await db.community.findUnique({
    where: { id: communityId },
    select: { creatorId: true },
  });
  if (!community) return false;
  if (community.creatorId === user.id) return true;

  const member = await db.communityMember.findUnique({
    where: { communityId_userId: { communityId, userId: user.id } },
    include: { memberRoles: { include: { role: true } } },
  });
  if (!member) return false;

  const perms = member.memberRoles.map((mr) => parsePermissions(mr.role.permissions));
  if (perms.length === 0) return hasPermission(defaultPermissionsForRole("MEMBER"), permission);
  return perms.some((p) => hasPermission(p, permission));
}
