/**
 * 관리자(스태프·운영자) 웹 세션 절대 수명.
 * 로그인 시각부터 1시간. 활동으로 연장되지 않음.
 */
export const ADMIN_WEB_SESSION_TTL_SEC = 60 * 60;

type AdminSessionToken = {
  isStaff?: unknown;
  isOperator?: unknown;
  adminSessionStartedAt?: number;
};

/** 로그인 시각이 있으면 1시간이 지났는지. 시각이 없으면 false (아직 찍기 전). */
export function isAdminWebSessionExpired(
  startedAt: number | null | undefined,
  nowSec = Math.floor(Date.now() / 1000)
): boolean {
  const started = Number(startedAt);
  if (!Number.isFinite(started) || started <= 0) return false;
  return nowSec >= started + ADMIN_WEB_SESSION_TTL_SEC;
}

/**
 * JWT 콜백에서 호출.
 * 관리자면 시작 시각을 유지하고, 1시간이 지나면 null (세션 폐기).
 * 새 로그인 또는 기존 토큰에 시각이 없으면 지금으로 찍는다.
 */
export function applyAdminWebSessionLifetime<T extends AdminSessionToken>(
  token: T,
  opts?: { isNewLogin?: boolean; nowSec?: number }
): T | null {
  const isAdmin = Boolean(token.isStaff || token.isOperator);
  if (!isAdmin) {
    delete token.adminSessionStartedAt;
    return token;
  }

  const now = opts?.nowSec ?? Math.floor(Date.now() / 1000);
  const existing = Number(token.adminSessionStartedAt);
  if (opts?.isNewLogin || !Number.isFinite(existing) || existing <= 0) {
    token.adminSessionStartedAt = now;
    return token;
  }
  if (now >= existing + ADMIN_WEB_SESSION_TTL_SEC) return null;
  return token;
}
