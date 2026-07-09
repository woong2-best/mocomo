import { cache } from "react";
import { db } from "@/lib/db";
import {
  defaultPermissionsForRole,
  mergePermissions,
  parsePermissions,
  guestPermissions,
} from "@/lib/community-server/permissions";
import type { CommunityPermissions } from "@/lib/community-server/types";

type MemberRoleRow = {
  role: string;
  memberRoles: { role: { permissions: unknown; type: string } }[];
};

export function permissionsFromMember(
  member: MemberRoleRow | null | undefined,
  isOwner: boolean,
  communityId: string,
  fallbackRolePermissions?: CommunityPermissions
): CommunityPermissions {
  if (!member) return guestPermissions();

  const fromRoles = member.memberRoles.map((mr) => parsePermissions(mr.role.permissions));
  if (fromRoles.length > 0) return mergePermissions(fromRoles);

  if (fallbackRolePermissions) return fallbackRolePermissions;

  const roleType = isOwner || member.role === "owner" ? "OWNER" : "MEMBER";
  return defaultPermissionsForRole(roleType);
}

async function loadDefaultRolePermissions(
  communityId: string,
  isOwner: boolean
): Promise<CommunityPermissions | undefined> {
  const dbRole = await db.communityRole.findFirst({
    where: isOwner
      ? { communityId, type: "OWNER" }
      : { communityId, isDefault: true },
    select: { permissions: true },
  });
  return dbRole ? parsePermissions(dbRole.permissions) : undefined;
}

/** 요청당 1회 — 설정·모더레이션 액션에서 중복 권한 조회 방지 */
export const loadMemberPermissions = cache(
  async (
    communityId: string,
    userId: string,
    isOwner: boolean
  ): Promise<CommunityPermissions> => {
    const member = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
      include: {
        memberRoles: {
          include: { role: { select: { permissions: true, type: true } } },
        },
      },
    });
    if (!member) return guestPermissions();

    const fallback = member.memberRoles.length
      ? undefined
      : await loadDefaultRolePermissions(communityId, isOwner || member.role === "owner");
    return permissionsFromMember(
      member,
      isOwner || member.role === "owner",
      communityId,
      fallback
    );
  }
);
