/**
 * 운영자·스태프 식별 (Edge middleware·서버 공통 — DB import 없음).
 *
 * SITE_OPERATOR_USERNAME (기본: mocomocompany) 계정 = 사이트 OWNER.
 * username 일치면 OWNER (이메일 불일치로 막지 않음 — Vercel SITE_OPERATOR_EMAIL 오설정 방지).
 */

import { resolveEffectiveStaffRole, staffRoleRank } from "@/lib/staff-roles";

const DEFAULT_OPERATOR_USERNAME = "mocomocompany";

export function getOperatorUsername(): string {
  const raw = process.env.SITE_OPERATOR_USERNAME?.trim().toLowerCase();
  return raw || DEFAULT_OPERATOR_USERNAME;
}

/** 선택: 운영자 이메일 힌트 (강제 검증에 사용하지 않음) */
export function getOperatorEmail(): string | null {
  const raw = process.env.SITE_OPERATOR_EMAIL?.trim().toLowerCase();
  return raw || null;
}

/** username이 사이트 오너 계정인지 (대소문자 무시) */
export function isSiteOperatorAccount(user: {
  username: string;
  email?: string | null;
}): boolean {
  return user.username.trim().toLowerCase() === getOperatorUsername();
}

/**
 * 사이트 오너(OPERATOR) 여부.
 * DB role과 무관하게 운영자 username이면 true → /admin 진입 가능.
 */
export function isOperatorIdentity(user: {
  username: string;
  role?: string;
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
