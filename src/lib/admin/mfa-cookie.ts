/**
 * Re-export for middleware / legacy imports.
 * Canonical implementation: security/session-cookie.ts
 */
export {
  ADMIN_MFA_COOKIE,
  ADMIN_MFA_IDLE_TTL_SEC as ADMIN_MFA_TTL_SEC,
  ADMIN_TRUSTED_COOKIE,
  ADMIN_STEPUP_COOKIE,
  adminSecurityCookieOptions as adminMfaCookieOptions,
  createAdminMfaCookieValue,
  parseAdminMfaCookieValue,
  verifyAdminMfaCookieValue,
  type AdminMfaStage,
} from "@/lib/admin/security/session-cookie";

/** unused legacy constant kept for import compatibility */
export const ADMIN_MFA_CODE_TTL_MS = 10 * 60 * 1000;

export function adminMfaCodeIdentifier(userId: string) {
  return `admin-mfa:${userId}`;
}
