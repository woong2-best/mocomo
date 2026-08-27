/** 전역 HTTP 보안 헤더 (next.config / middleware 공용) */

const CSP_BASE = [
  "default-src 'self'",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss: blob:",
  "media-src 'self' https: blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
] as const;

/** Kakao Maps JS SDK + tile CDN (중고거래 직거래 지도) */
const KAKAO_MAP_SCRIPT_SRC =
  "https://dapi.kakao.com https://t1.daumcdn.net https://ssl.daumcdn.net";

/** Community voice/video — Jitsi external_api.js + embed iframe */
function jitsiOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_JITSI_DOMAIN?.trim() || "meet.jit.si";
  const host = raw.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return `https://${host}`;
}

const JITSI_ORIGIN = jitsiOrigin();

/** APT corner scene viewer — Three.js via unpkg import map */
export const APT_SCENE_VIEWER_HEADERS: { key: string; value: string }[] = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  {
    key: "Content-Security-Policy",
    value: [
      ...CSP_BASE,
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://unpkg.com",
      "frame-src 'self'",
      "frame-ancestors 'self'",
    ].join("; "),
  },
];

/** External live embeds (YouTube / Twitch / CHZZK) + payment widgets */
const EMBED_FRAME_SRC =
  "https://challenges.cloudflare.com https://js.stripe.com https://www.youtube.com https://www.youtube-nocookie.com https://player.twitch.tv https://chzzk.naver.com";

export const SECURITY_HEADERS: { key: string; value: string }[] = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
  {
    key: "Permissions-Policy",
    value: `camera=(self "${JITSI_ORIGIN}"), microphone=(self "${JITSI_ORIGIN}"), geolocation=(self), payment=(self)`,
  },
  {
    key: "Content-Security-Policy",
    value: [
      ...CSP_BASE,
      `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://challenges.cloudflare.com https://js.stripe.com ${KAKAO_MAP_SCRIPT_SRC} ${JITSI_ORIGIN}`,
      `frame-src 'self' ${EMBED_FRAME_SRC} ${JITSI_ORIGIN}`,
      "frame-ancestors 'none'",
    ].join("; "),
  },
];
