import { db } from "@/lib/db";
import {
  defaultPermissionsForRole,
  mergePermissions,
  parsePermissions,
  guestPermissions,
} from "@/lib/community-server/permissions";
import type { CommunityPermissions } from "@/lib/community-server/types";

export async function loadMemberPermissions(
  communityId: string,
  userId: string,
  isOwner: boolean
): Promise<CommunityPermissions> {
  const member = await db.communityMember.findUnique({
    where: { communityId_userId: { communityId, userId } },
    include: {
      memberRoles: {
        include: { role: { select: { permissions: true, type: true } } },
      },
    },
  });
  if (!member) return guestPermissions();

  const fromRoles = member.memberRoles.map((mr) => parsePermissions(mr.role.permissions));
  if (fromRoles.length > 0) return mergePermissions(fromRoles);

  // 역할 미할당 멤버 — DB 기본 역할 또는 레거시 owner 플래그
  const roleType = isOwner || member.role === "owner" ? "OWNER" : "MEMBER";
  const dbRole = await db.communityRole.findFirst({
    where: isOwner || member.role === "owner"
      ? { communityId, type: "OWNER" }
      : { communityId, isDefault: true },
    select: { permissions: true },
  });
  if (dbRole) return parsePermissions(dbRole.permissions);
  return defaultPermissionsForRole(roleType);
}
