import type { NextConfig } from "next";
import { APT_SCENE_VIEWER_HEADERS, SECURITY_HEADERS } from "./src/lib/security-headers";

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
  env: {
    NEXT_PUBLIC_APT_BUILD_ID:
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
      process.env.VERCEL_GIT_COMMIT_REF ??
      "local",
  },
  transpilePackages: [
    "@mediapipe/tasks-vision",
    "@pixiv/three-vrm",
    "three",
    "@huggingface/transformers",
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals as string[] | undefined ?? []), "@huggingface/transformers"];
    }
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      "onnxruntime-node$": false,
    };
    return config;
  },
  // Lint runs in CI via `npm run lint`; in-build linting adds several hundred MB
  // to an already memory-tight build container.
  eslint: { ignoreDuringBuilds: true },
  // scripts/next-build.cjs already ran `tsc --noEmit` in a separate process.
  ...(process.env.NEXT_SKIP_TYPECHECK ? { typescript: { ignoreBuildErrors: true } } : {}),
  async rewrites() {
    return {
      beforeFiles: studioHostRewrites(),
    };
  },
  async redirects() {
    // Legacy emoticon-shop URLs only. Do NOT redirect /market itself —
    // MARKET is the Stripe Connect marketplace (was wrongly sent to /support).
    return [
      { source: "/market/storage", destination: "/support?tab=storage", permanent: true },
      { source: "/market/received", destination: "/support?tab=gifts", permanent: true },
    ];
  },
  async headers() {
    const aptScenePaths = [
      "/apt/hero-assets/scene-material-assembly.html",
      "/apt/materials/:path*",
      "/apt/glb/:path*",
      "/apt/hero-assets/scene-composition-config.json",
      "/apt/reference/:path*",
    ];
    return [
      {
        source: "/(.*)",
        headers: SECURITY_HEADERS,
      },
      {
        source: "/diorama/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/apt/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      ...aptScenePaths.map((source) => ({
        source,
        headers: APT_SCENE_VIEWER_HEADERS,
      })),
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
      dynamic: 120,
      static: 600,
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
