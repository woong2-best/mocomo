import type { IceServerConfig, TurnProvider } from "@/lib/webrtc-turn/types";

const DEFAULT_STUN: IceServerConfig[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export function parseIceServersJson(raw: string | undefined): IceServerConfig[] | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as IceServerConfig[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed.filter((s) => s?.urls);
  } catch {
    return null;
  }
}

export function getStunServersFromEnv(): IceServerConfig[] {
  const fromEnv =
    parseIceServersJson(process.env.NEXT_PUBLIC_STUN_SERVERS) ??
    parseIceServersJson(process.env.STUN_SERVERS);
  return fromEnv?.length ? fromEnv : DEFAULT_STUN;
}

/** Legacy single-URL TURN env (coturn long-term credentials). */
export function getLegacyTurnServerFromEnv(): IceServerConfig | null {
  const url = process.env.NEXT_PUBLIC_TURN_URL?.trim() || process.env.TURN_URL?.trim();
  if (!url) return null;
  return {
    urls: url,
    username: process.env.TURN_USERNAME || process.env.NEXT_PUBLIC_TURN_USERNAME || undefined,
    credential: process.env.TURN_CREDENTIAL || process.env.NEXT_PUBLIC_TURN_CREDENTIAL || undefined,
  };
}

export function getStaticTurnServersFromEnv(): IceServerConfig[] {
  const fromJson =
    parseIceServersJson(process.env.NEXT_PUBLIC_TURN_SERVERS) ??
    parseIceServersJson(process.env.TURN_SERVERS);
  if (fromJson?.length) return fromJson;

  const legacy = getLegacyTurnServerFromEnv();
  return legacy ? [legacy] : [];
}

export function getIceTransportPolicyFromEnv(): RTCIceTransportPolicy | undefined {
  const raw =
    process.env.NEXT_PUBLIC_WEBRTC_ICE_TRANSPORT_POLICY?.trim() ||
    process.env.WEBRTC_ICE_TRANSPORT_POLICY?.trim();
  if (raw === "relay" || raw === "all") return raw;
  return undefined;
}

/** Drop Cloudflare TURN URLs on port 53 — blocked in Chrome/Firefox. */
export function filterBrowserBlockedTurnUrls(urls: string | string[]): string | string[] {
  const list = Array.isArray(urls) ? urls : [urls];
  const filtered = list.filter((u) => !/:53(\?|$)/.test(u));
  if (filtered.length === 0) return urls;
  return filtered.length === 1 ? filtered[0]! : filtered;
}

export function normalizeTurnProvider(raw: string | undefined): TurnProvider {
  const v = raw?.trim().toLowerCase();
  if (v === "static" || v === "coturn" || v === "cloudflare") return v;
  return "none";
}

export function coturnDefaultUrls(host: string): string[] {
  const h = host.replace(/^turns?:\/\//, "").split(":")[0]!;
  return [
    `turn:${h}:3478?transport=udp`,
    `turn:${h}:3478?transport=tcp`,
    `turns:${h}:5349?transport=tcp`,
    `turns:${h}:443?transport=tcp`,
  ];
}
