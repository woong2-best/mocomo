import type { ResolvedIceConfig } from "@/lib/webrtc-turn/types";
import {
  getIceTransportPolicyFromEnv,
  getLegacyTurnServerFromEnv,
  getStunServersFromEnv,
  getStaticTurnServersFromEnv,
  parseIceServersJson,
} from "@/lib/webrtc-turn/stun";

export type { IceServerConfig } from "@/lib/webrtc-turn/types";

/** Client-side fallback when API unavailable (local dev). */
export function getClientFallbackIceConfig(): ResolvedIceConfig {
  const stun =
    parseIceServersJson(process.env.NEXT_PUBLIC_STUN_SERVERS) ?? getStunServersFromEnv();
  const servers = [...stun];
  servers.push(...getStaticTurnServersFromEnv());
  const legacy = getLegacyTurnServerFromEnv();
  if (legacy) servers.push(legacy);

  return {
    iceServers: servers,
    iceTransportPolicy: getIceTransportPolicyFromEnv(),
  };
}

export async function fetchWebRtcIceConfiguration(): Promise<RTCConfiguration> {
  try {
    const res = await fetch("/api/webrtc/ice-servers", { credentials: "include", cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as ResolvedIceConfig;
      return {
        iceServers: data.iceServers,
        ...(data.iceTransportPolicy ? { iceTransportPolicy: data.iceTransportPolicy } : {}),
      };
    }
  } catch {
    /* fallback */
  }

  const fallback = getClientFallbackIceConfig();
  return {
    iceServers: fallback.iceServers,
    ...(fallback.iceTransportPolicy ? { iceTransportPolicy: fallback.iceTransportPolicy } : {}),
  };
}

/** @deprecated use fetchWebRtcIceConfiguration */
export function getWebRtcIceServers() {
  return getClientFallbackIceConfig().iceServers;
}

/** @deprecated use fetchWebRtcIceConfiguration */
export function getRtcConfiguration(): RTCConfiguration {
  const fallback = getClientFallbackIceConfig();
  return {
    iceServers: fallback.iceServers,
    ...(fallback.iceTransportPolicy ? { iceTransportPolicy: fallback.iceTransportPolicy } : {}),
  };
}
