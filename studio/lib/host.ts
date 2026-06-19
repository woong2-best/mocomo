const DEFAULT_STUDIO_HOSTS = ["studio.mocomo.com", "studio.localhost", "studio.mocomo.net", "studio-staging.mocomo.com"];

export function getStudioHostnames(): string[] {
  const fromEnv = process.env.NEXT_PUBLIC_STUDIO_HOST?.trim();
  if (fromEnv) return [fromEnv, ...DEFAULT_STUDIO_HOSTS];
  return DEFAULT_STUDIO_HOSTS;
}

/** Edge middleware — Host / X-Forwarded-Host 기준 (Vercel 커스텀 도메인) */
export function resolveRequestHostname(
  hostHeader: string | null | undefined,
  fallback?: string | null
): string {
  const raw = hostHeader ?? fallback ?? "";
  return raw.split(":")[0]?.toLowerCase() ?? "";
}

export function isStudioHostname(host: string | null | undefined): boolean {
  if (!host) return false;
  const bare = host.split(":")[0]?.toLowerCase() ?? "";
  return getStudioHostnames().some((h) => h.toLowerCase() === bare);
}

export function getStudioBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_STUDIO_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000/studio";
  }
  return "https://studio.mocomo.com";
}

export function getMocomoBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }
  return "https://mocomo.com";
}

export function getMocomoSignInUrl(callbackUrl: string): string {
  const base = getMocomoBaseUrl();
  return `${base}/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}

/** studio 서브도메인에서 /market → /studio/market rewrite용 */
export function studioInternalPath(pathname: string): string {
  if (pathname.startsWith("/studio")) return pathname;
  if (pathname === "/") return "/studio";
  return `/studio${pathname}`;
}
