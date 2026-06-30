/** requireAdmin() 거부 — 비운영자 접근 */
export function isAdminForbiddenError(error: unknown): boolean {
  return error instanceof Error && error.message === "FORBIDDEN";
}
