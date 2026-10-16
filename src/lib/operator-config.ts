/**
 * 운영자·스태프 식별 (Edge middleware·서버 공통 — DB import 없음).
 *
 * SITE_OPERATOR_USERNAMES (쉼표 구분, 기본: mocomocompany,admin) = 사이트 OWNER.
 * SITE_OPERATOR_EMAILS (쉼표 구분, 기본: mocomo.llc@gmail.com) = 사이트 OWNER.
 * username 또는 이메일 일치면 OWNER (/admin·운영 MFA 대상).
 */

import { resolveEffectiveStaffRole, staffRoleRank } from "@/lib/staff-roles";

const DEFAULT_OPERATOR_USERNAMES = ["mocomocompany", "admin"] as const;
const DEFAULT_OPERATOR_EMAILS = ["mocomo.llc@gmail.com"] as const;

export function getOperatorUsernames(): string[] {
  const raw = process.env.SITE_OPERATOR_USERNAMES?.trim();
  if (raw) {
    const parsed = raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (parsed.length > 0) return parsed;
  }
  return [...DEFAULT_OPERATOR_USERNAMES];
}

/** 사이트 오너로 취급할 이메일. 기본 주소는 환경 변수로 빼지 않는다. */
export function getOperatorEmails(): string[] {
  const raw = process.env.SITE_OPERATOR_EMAILS?.trim();
  const fromEnv = raw
    ? raw
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    : [];
  return [...new Set([...DEFAULT_OPERATOR_EMAILS, ...fromEnv])];
}

/** @deprecated — 첫 번째 운영자 username (레거시 호환) */
export function getOperatorUsername(): string {
  return getOperatorUsernames()[0] ?? DEFAULT_OPERATOR_USERNAMES[0];
}

/** 선택: 운영자 이메일 힌트 (강제 검증에 사용하지 않음) */
export function getOperatorEmail(): string | null {
  const raw = process.env.SITE_OPERATOR_EMAIL?.trim().toLowerCase();
  return raw || null;
}

/** username 또는 운영자 이메일이 사이트 오너 계정인지 (대소문자 무시) */
export function isSiteOperatorAccount(user: {
  username: string;
  email?: string | null;
}): boolean {
  const un = user.username.trim().toLowerCase();
  if (getOperatorUsernames().includes(un)) return true;
  const email = user.email?.trim().toLowerCase();
  return Boolean(email && getOperatorEmails().includes(email));
}

/**
 * 사이트 오너(OPERATOR) 여부.
 * DB role과 무관하게 운영자 username이면 true → /admin·사이트 MFA.
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
