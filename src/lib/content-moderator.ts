import { isOperatorIdentity, isStaffIdentity } from "@/lib/operator-config";
import { resolveEffectiveStaffRole, staffRoleRank } from "@/lib/staff-roles";

export function canModerateContent(user: {
  username: string;
  role: string;
  email?: string | null;
}): boolean {
  if (isOperatorIdentity(user)) return true;
  if (!isStaffIdentity(user)) return false;
  return staffRoleRank(resolveEffectiveStaffRole(user)) >= staffRoleRank("MODERATOR");
}
