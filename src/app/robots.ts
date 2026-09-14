import type { MetadataRoute } from "next";
import { MOCOMO_PUBLIC_ORIGIN, getPublicSiteOrigin } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const origin = getPublicSiteOrigin();
  const sitemapOrigin =
    process.env.VERCEL_ENV === "production" || origin === MOCOMO_PUBLIC_ORIGIN
      ? MOCOMO_PUBLIC_ORIGIN
      : origin;

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${sitemapOrigin}/sitemap.xml`,
  };
}
