import type { CommunityRoleType } from "@prisma/client";
import { hasAdministrator, hasPermission } from "@/lib/community-server/permissions";
import type { CommunityPermissions } from "@/lib/community-server/types";

/** 멤버 사이드바에서 해당 직위 그룹에 + 로 멤버 추가 가능 여부 */
export function canAssignRoleType(
  permissions: CommunityPermissions,
  isOwner: boolean,
  roleType: CommunityRoleType
): boolean {
  if (isOwner || hasAdministrator(permissions) || hasPermission(permissions, "manageRoles")) {
    return true;
  }
  switch (roleType) {
    case "OWNER":
      return hasPermission(permissions, "assignOwner");
    case "ADMIN":
      return hasPermission(permissions, "assignAdmin");
    case "MODERATOR":
      return hasPermission(permissions, "assignModerator");
    case "VIP":
      return hasPermission(permissions, "assignVip");
    case "MEMBER":
      return hasPermission(permissions, "manageRoles");
    default:
      return false;
  }
}
