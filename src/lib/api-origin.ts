import type { NextRequest } from "next/server";
import { getAuthUrl } from "@/lib/auth-env";

function normalizeOrigin(origin: string): string {
  try {
    const url = new URL(origin);
    return `${url.protocol}//${url.host}`;
  } catch {
    return origin.replace(/\/$/, "");
  }
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
}

/** CSRF 완화 — 동일 사이트 Origin/Referer 검사 */
export function verifyApiOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const candidate = origin || referer;
  if (!candidate) return false;

  const allowed = new Set<string>();
  const authUrl = getAuthUrl();
  if (authUrl) allowed.add(normalizeOrigin(authUrl));

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) allowed.add(normalizeOrigin(appUrl));

  const host = req.nextUrl.hostname;
  if (host) {
    allowed.add(`${req.nextUrl.protocol}//${req.nextUrl.host}`);
    if (isProduction()) {
      allowed.add(`https://${host}`);
    }
  }

  const studio = process.env.NEXT_PUBLIC_STUDIO_URL?.trim();
  if (studio) allowed.add(normalizeOrigin(studio));

  return allowed.has(normalizeOrigin(candidate));
}

/** Webhook·cron·IAP 등 Origin 검사 제외 경로 */
export const MUTATING_API_ORIGIN_EXEMPT_PREFIXES = [
  "/api/webhooks/",
  "/api/livekit/webhook",
  "/api/live/srs-webhook",
  "/api/iap/",
  "/api/cron/",
  "/api/health/",
  "/api/platform/bootstrap",
  "/api/integrations/",
  "/api/auth/callback/",
  "/api/auth/signin",
  "/api/auth/signout",
  "/api/auth/logout",
  "/api/auth/accounts/",
  "/api/auth/session",
  "/api/auth/providers",
  "/api/auth/csrf",
  // RN Bearer clients have no browser Origin; mutating /api/mobile/* requires Bearer.
  "/api/mobile/",
] as const;

export function shouldGuardMutatingApiOrigin(
  pathname: string,
  method: string
): boolean {
  if (!pathname.startsWith("/api/")) return false;
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return false;
  return !MUTATING_API_ORIGIN_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p));
}
