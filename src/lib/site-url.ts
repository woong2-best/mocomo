/** Canonical public web origin for SEO (sitemap, robots, Open Graph). */
export const MOCOMO_PUBLIC_ORIGIN = "https://mocomo.net";

export function getPublicSiteOrigin(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    return appUrl.replace(/\/$/, "");
  }
  if (process.env.VERCEL_ENV === "production") {
    return MOCOMO_PUBLIC_ORIGIN;
  }
  const vercelHost = process.env.VERCEL_URL?.trim();
  if (vercelHost) {
    return `https://${vercelHost.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}

export function publicSiteUrl(pathname: string): string {
  const origin = getPublicSiteOrigin();
  if (pathname === "/" || pathname === "") {
    return `${origin}/`;
  }
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${origin}${path}`;
}
