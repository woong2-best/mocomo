/**
 * 운영자·스태프 식별 (12-factor: Vercel 환경 변수).
 * Edge(middleware)·서버 공통 — DB import 없음.
 */

import { resolveEffectiveStaffRole, staffRoleRank } from "@/lib/staff-roles";

const DEFAULT_OPERATOR_USERNAME = "mocomocompany";

export function getOperatorUsername(): string {
  const raw = process.env.SITE_OPERATOR_USERNAME?.trim().toLowerCase();
  return raw || DEFAULT_OPERATOR_USERNAME;
}

/** 선택: 운영자 이메일까지 일치해야 ADMIN 인정 (이중 확인) */
export function getOperatorEmail(): string | null {
  const raw = process.env.SITE_OPERATOR_EMAIL?.trim().toLowerCase();
  return raw || null;
}

export function isOperatorIdentity(
  user: { username: string; role: string; email?: string | null }
): boolean {
  const role = resolveEffectiveStaffRole(user);
  if (staffRoleRank(role) >= staffRoleRank("ADMIN")) return true;
  if (user.role !== "ADMIN") return false;
  if (user.username.trim().toLowerCase() !== getOperatorUsername()) return false;
  const requiredEmail = getOperatorEmail();
  if (requiredEmail) {
    const userEmail = user.email?.trim().toLowerCase();
    if (!userEmail || userEmail !== requiredEmail) return false;
  }
  return true;
}

export function isStaffIdentity(user: { role: string; username: string; email?: string | null }): boolean {
  const role = resolveEffectiveStaffRole(user);
  return staffRoleRank(role) >= staffRoleRank("MODERATOR");
}

/** JWT/미들웨어용 */
export function effectiveRole(
  user: { username: string; role: string; email?: string | null }
): string {
  const resolved = resolveEffectiveStaffRole(user);
  if (staffRoleRank(resolved) >= staffRoleRank("MODERATOR")) return resolved;
  if (user.role === "ADMIN" && !isOperatorIdentity(user)) return "USER";
  return user.role;
}
