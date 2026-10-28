/** Meta OAuth helpers shared by Facebook Login and Instagram Login (separate apps). */

export function normalizeOAuthCode(raw: string | null): string | null {
  if (!raw) return null;
  return raw.replace(/#_+$/, "").trim() || null;
}

export function safeOAuthReturnTo(raw: string | null | undefined): string | undefined {
  const path = raw?.trim();
  if (!path?.startsWith("/") || path.startsWith("//")) return undefined;
  return path;
}

export type GraphErrorBody = {
  error?: { message?: string; type?: string; code?: number };
  error_message?: string;
  error_type?: string;
};

export function tokenErrorMessage(data: GraphErrorBody, status: number): string {
  return (
    data.error?.message ??
    data.error_message ??
    data.error_type ??
    `Token exchange failed (${status})`
  );
}
