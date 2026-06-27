import type { NextConfig } from "next";
import { SECURITY_HEADERS } from "./src/lib/security-headers";

const STUDIO_REWRITE_HOSTS = [
  process.env.NEXT_PUBLIC_STUDIO_HOST?.trim(),
  "studio.mocomo.net",
  "studio.mocomo.com",
  "studio.localhost",
  "studio-staging.mocomo.com",
].filter((h): h is string => Boolean(h));

function studioHostRewrites() {
  return STUDIO_REWRITE_HOSTS.flatMap((host) => [
    {
      source: "/",
      has: [{ type: "host" as const, value: host }],
      destination: "/studio",
    },
    {
      source: "/:path((?!studio|api|auth|_next).*)",
      has: [{ type: "host" as const, value: host }],
      destination: "/studio/:path",
    },
  ]);
}

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  devIndicators: false,
  transpilePackages: ["@mediapipe/tasks-vision", "@pixiv/three-vrm", "three"],
  async rewrites() {
    return {
      beforeFiles: studioHostRewrites(),
    };
  },
  async redirects() {
    return [
      { source: "/market", destination: "/support?tab=emoticons", permanent: true },
      { source: "/market/emoticons", destination: "/support?tab=emoticons", permanent: true },
      {
        source: "/market/emoticons/:slug",
        destination: "/support/emoticons/:slug",
        permanent: true,
      },
      { source: "/market/storage", destination: "/support?tab=storage", permanent: true },
      { source: "/market/received", destination: "/support?tab=gifts", permanent: true },
      { source: "/market/goods", destination: "/support?tab=emoticons", permanent: true },
      { source: "/market/goods/:path*", destination: "/support?tab=emoticons", permanent: true },
      { source: "/market/sell", destination: "/support?tab=emoticons", permanent: true },
      { source: "/market/orders", destination: "/support", permanent: true },
      { source: "/market/orders/:path*", destination: "/support", permanent: true },
      { source: "/market/digital/:path*", destination: "/support?tab=emoticons", permanent: true },
      { source: "/market/:id", destination: "/support?tab=emoticons", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: SECURITY_HEADERS,
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: "50mb" },
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "@radix-ui/react-avatar",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toast",
      "@radix-ui/react-tooltip",
      "framer-motion",
      "@livekit/components-react",
      "livekit-client",
      "socket.io-client",
      "next-auth",
      "next-auth/react",
    ],
  },
};

export default nextConfig;
