/** Machine-readable gate for unsigned-latest-terms users. */
export const TERMS_REQUIRED_CODE = "TERMS_REQUIRED";

export const TERMS_REQUIRED_ERROR =
  "Updated Terms of Service agreement is required.";

export type TermsRequiredPayload = {
  error: string;
  code: typeof TERMS_REQUIRED_CODE;
  versionTag: string | null;
  effectiveDate: string | null;
  termsUrl: string | null;
};

export function isTermsGateExemptApiPath(pathname: string): boolean {
  if (pathname.startsWith("/api/auth")) return true;
  if (pathname.startsWith("/api/webhooks")) return true;
  if (pathname.startsWith("/api/health")) return true;
  if (pathname.startsWith("/api/cron")) return true;
  if (pathname.startsWith("/api/legal/terms")) return true;
  if (pathname.startsWith("/api/mobile/legal/terms")) return true;
  if (pathname.startsWith("/api/mobile/auth")) return true;
  return false;
}

export function isTermsGateExemptPagePath(pathname: string): boolean {
  if (pathname.startsWith("/auth")) return true;
  if (pathname.startsWith("/legal")) return true;
  if (pathname === "/terms" || pathname.startsWith("/terms/")) return true;
  if (pathname === "/privacy" || pathname.startsWith("/privacy/")) return true;
  return false;
}
