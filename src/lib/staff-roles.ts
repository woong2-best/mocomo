import type { UserRole } from "@prisma/client";
import { getOperatorUsername } from "@/lib/operator-config";

export const STAFF_ROLE_RANK: Record<UserRole, number> = {
  USER: 0,
  VERIFIED: 1,
  MODERATOR: 2,
  SENIOR_MODERATOR: 3,
  ADMIN: 4,
  SUPER_ADMIN: 5,
  OWNER: 6,
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

export function canCreateStaff(actorRole: string): boolean {
  return actorRole === "OWNER" || actorRole === "SUPER_ADMIN";
}

export function canCreateRole(actorRole: string, targetRole: UserRole): boolean {
  if (targetRole === "OWNER") return false;
  if (targetRole === "SUPER_ADMIN") return actorRole === "OWNER";
  return canCreateStaff(actorRole);
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

/** 레거시 운영자 계정 → OWNER 로 승격 */
export function resolveEffectiveStaffRole(user: {
  username: string;
  role: string;
  email?: string | null;
}): UserRole {
  if (user.username.trim().toLowerCase() === getOperatorUsername() && user.role === "ADMIN") {
    return "OWNER";
  }
  return user.role as UserRole;
}

export const STAFF_ROLE_LABELS: Record<UserRole, string> = {
  USER: "일반",
  VERIFIED: "인증",
  MODERATOR: "모더레이터",
  SENIOR_MODERATOR: "시니어 모더레이터",
  ADMIN: "관리자",
  SUPER_ADMIN: "최고 관리자",
  OWNER: "소유자",
};
