import type { CommunityRoleType } from "@prisma/client";
import { ROLE_GROUP_ORDER } from "./rbac-defaults";

export function getPrimaryRoleType(
  roles: { type: CommunityRoleType }[],
  isOwner: boolean
): CommunityRoleType {
  if (isOwner) return "OWNER";
  for (const t of ROLE_GROUP_ORDER) {
    if (roles.some((r) => r.type === t)) return t;
  }
  return "MEMBER";
}
