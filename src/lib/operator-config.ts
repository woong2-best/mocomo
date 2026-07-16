/**
 * 운영자·스태프 식별 (Edge middleware·서버 공통 — DB import 없음).
 *
 * SITE_OPERATOR_USERNAME (기본: mocomocompany) 계정만 사이트 OWNER.
 * 관리자 계정 추가/삭제는 OWNER만 가능.
 */

import { resolveEffectiveStaffRole, staffRoleRank } from "@/lib/staff-roles";

const DEFAULT_OPERATOR_USERNAME = "mocomocompany";

export function getOperatorUsername(): string {
  const raw = process.env.SITE_OPERATOR_USERNAME?.trim().toLowerCase();
  return raw || DEFAULT_OPERATOR_USERNAME;
}

/** 선택: 운영자 이메일까지 일치해야 OWNER 인정 (이중 확인) */
export function getOperatorEmail(): string | null {
  const raw = process.env.SITE_OPERATOR_EMAIL?.trim().toLowerCase();
  return raw || null;
}

/** username(+선택 email)이 사이트 오너 계정인지 */
export function isSiteOperatorAccount(user: {
  username: string;
  email?: string | null;
}): boolean {
  if (user.username.trim().toLowerCase() !== getOperatorUsername()) return false;
  const requiredEmail = getOperatorEmail();
  if (!requiredEmail) return true;
  const userEmail = user.email?.trim().toLowerCase();
  return !!userEmail && userEmail === requiredEmail;
}

/**
 * 사이트 오너(OPERATOR) 여부.
 * DB role과 무관하게 mocomocompany(설정값)면 true → /admin 진입 가능.
 */
export function isOperatorIdentity(user: {
  username: string;
  role: string;
  email?: string | null;
}): boolean {
  return isSiteOperatorAccount(user);
}

export function isStaffIdentity(user: {
  role: string;
  username: string;
  email?: string | null;
}): boolean {
  if (isSiteOperatorAccount(user)) return true;
  const role = resolveEffectiveStaffRole(user);
  if (staffRoleRank(role) >= staffRoleRank("MODERATOR")) return true;
  return (
    role === "MARKETING" ||
    role === "CUSTOMER_SUPPORT" ||
    role === "SETTLEMENT_MANAGER"
  );
}

/** JWT/미들웨어용 */
export function effectiveRole(user: {
  username: string;
  role: string;
  email?: string | null;
}): string {
  if (isSiteOperatorAccount(user)) return "OWNER";
  const resolved = resolveEffectiveStaffRole(user);
  if (isStaffIdentity({ ...user, role: resolved })) return resolved;
  return user.role;
}
