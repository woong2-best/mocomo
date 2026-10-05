import type { IceServerConfig, ResolvedIceConfig } from "@/lib/webrtc-turn/types";

/** Google public STUN only — no TURN, no relay billing. */
export const GOOGLE_STUN_URLS = [
  "stun:stun.l.google.com:19302",
  "stun:stun1.l.google.com:19302",
] as const;

export const GOOGLE_STUN_ICE_SERVERS: IceServerConfig[] = [
  { urls: [...GOOGLE_STUN_URLS] },
];

export const P2P_STUN_ICE_CONFIG: ResolvedIceConfig = {
  iceServers: GOOGLE_STUN_ICE_SERVERS,
};

export const CALL_NAT_BLOCKED_TITLE = "Check your Wi-Fi";

export const CALL_NAT_BLOCKED_MESSAGE =
  "Direct voice or video connection is not possible on this network (firewall or LTE symmetric NAT). Please switch to Wi-Fi and try again.";

export function googleStunRtcConfiguration(): RTCConfiguration {
  return { iceServers: GOOGLE_STUN_ICE_SERVERS };
}

export function isStunUrl(url: string): boolean {
  return url.startsWith("stun:");
}

/** Drop any turn:/turns: entry so a misconfigured env cannot bill relay. */
export function stunOnlyIceServers(servers: IceServerConfig[] | undefined): IceServerConfig[] {
  const kept: IceServerConfig[] = [];
  for (const server of servers ?? []) {
    const urls = (Array.isArray(server.urls) ? server.urls : [server.urls]).filter(
      (url): url is string => typeof url === "string" && isStunUrl(url)
    );
    if (urls.length === 0) continue;
    kept.push({ urls: urls.length === 1 ? urls[0]! : urls });
  }
  return kept.length > 0 ? kept : GOOGLE_STUN_ICE_SERVERS;
}
