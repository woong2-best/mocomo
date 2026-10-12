import { isSiteOperatorAccount } from "@/lib/operator-config";
import { resolveEffectiveStaffRole, staffRoleRank } from "@/lib/staff-roles";

/**
 * Free unlimited event ads / unpaid campaign activation.
 * Site operators and CMS ADMIN+ (ADMIN, SUPER_ADMIN, OWNER).
 */
export function canRegisterSponsoredAdComplimentary(user: {
  username: string;
  role?: string;
  email?: string | null;
}): boolean {
  if (isSiteOperatorAccount(user)) return true;
  const role = resolveEffectiveStaffRole({
    username: user.username,
    role: user.role ?? "USER",
    email: user.email,
  });
  return staffRoleRank(role) >= staffRoleRank("ADMIN");
}
