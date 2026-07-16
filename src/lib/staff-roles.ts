import type { UserRole } from "@prisma/client";
import { getOperatorUsername } from "@/lib/operator-config";
import {
  ADMIN_ROLE_LABELS,
  ALL_ADMIN_PERMISSIONS,
  hasAdminPermission,
  isAdminCmsRole,
  pathPermission,
  permissionsForRole,
  type AdminPermission,
} from "@/lib/admin/permissions";

export const STAFF_ROLE_RANK: Record<UserRole, number> = {
  USER: 0,
  VERIFIED: 1,
  MARKETING: 2,
  CUSTOMER_SUPPORT: 2,
  MODERATOR: 3,
  SETTLEMENT_MANAGER: 3,
  SENIOR_MODERATOR: 4,
  ADMIN: 5,
  SUPER_ADMIN: 6,
  OWNER: 7,
};

export function staffRoleRank(role: UserRole | string): number {
  return STAFF_ROLE_RANK[role as UserRole] ?? 0;
}

export function hasMinStaffRole(user: { role: string }, minRole: UserRole): boolean {
  return staffRoleRank(user.role) >= staffRoleRank(minRole);
}

export function isOwnerRole(role: string): boolean {
  return role === "OWNER";
}

/** 관리자 계정 생성·삭제·권한변경 — OWNER만 */
export function canManageAdminAccounts(actorRole: string): boolean {
  return actorRole === "OWNER";
}

export function canCreateStaff(actorRole: string): boolean {
  return canManageAdminAccounts(actorRole);
}

export function canCreateRole(actorRole: string, targetRole: UserRole): boolean {
  if (!canManageAdminAccounts(actorRole)) return false;
  if (targetRole === "OWNER") return false;
  if (targetRole === "USER" || targetRole === "VERIFIED") return true;
  if (!isAdminCmsRole(targetRole)) return false;
  return true;
}

export function canApplySanction(actorRole: string, sanction: string): boolean {
  const rank = staffRoleRank(actorRole);
  if (sanction === "warning") return rank >= staffRoleRank("MODERATOR");
  if (sanction === "limited" || sanction === "temp_7" || sanction === "temp_30") {
    return rank >= staffRoleRank("SENIOR_MODERATOR");
  }
  if (sanction === "read_only" || sanction === "permanent" || sanction === "restore") {
    return rank >= staffRoleRank("ADMIN");
  }
  return false;
}

/** 사이트 오너 유저명 → 항상 OWNER (DB role 무관) */
export function resolveEffectiveStaffRole(user: {
  username: string;
  role: string;
  email?: string | null;
}): UserRole {
  if (user.username.trim().toLowerCase() === getOperatorUsername()) {
    return "OWNER";
  }
  return user.role as UserRole;
}

export const STAFF_ROLE_LABELS: Record<UserRole, string> = {
  USER: ADMIN_ROLE_LABELS.USER,
  VERIFIED: ADMIN_ROLE_LABELS.VERIFIED,
  MARKETING: ADMIN_ROLE_LABELS.MARKETING,
  CUSTOMER_SUPPORT: ADMIN_ROLE_LABELS.CUSTOMER_SUPPORT,
  MODERATOR: ADMIN_ROLE_LABELS.MODERATOR,
  SETTLEMENT_MANAGER: ADMIN_ROLE_LABELS.SETTLEMENT_MANAGER,
  SENIOR_MODERATOR: ADMIN_ROLE_LABELS.SENIOR_MODERATOR,
  ADMIN: ADMIN_ROLE_LABELS.ADMIN,
  SUPER_ADMIN: ADMIN_ROLE_LABELS.SUPER_ADMIN,
  OWNER: ADMIN_ROLE_LABELS.OWNER,
};

export {
  hasAdminPermission,
  isAdminCmsRole,
  pathPermission,
  permissionsForRole,
  ALL_ADMIN_PERMISSIONS,
  type AdminPermission,
};
