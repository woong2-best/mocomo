"use client";

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

const ICE_CACHE_TTL_MS = 5 * 60 * 1000;
let iceCache: { config: RTCConfiguration; expiresAt: number } | null = null;
let iceInflight: Promise<RTCConfiguration> | null = null;

function toRtcConfiguration(data: ResolvedIceConfig): RTCConfiguration {
  return {
    iceServers: data.iceServers,
    ...(data.iceTransportPolicy ? { iceTransportPolicy: data.iceTransportPolicy } : {}),
  };
}

export async function fetchWebRtcIceConfiguration(): Promise<RTCConfiguration> {
  const now = Date.now();
  if (iceCache && iceCache.expiresAt > now) {
    return iceCache.config;
  }

  if (iceInflight) return iceInflight;

  iceInflight = (async () => {
    try {
      const res = await fetch("/api/webrtc/ice-servers", {
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as ResolvedIceConfig;
        const config = toRtcConfiguration(data);
        iceCache = { config, expiresAt: Date.now() + ICE_CACHE_TTL_MS };
        return config;
      }
    } catch {
      /* fallback */
    }

    const fallback = getClientFallbackIceConfig();
    const config = toRtcConfiguration(fallback);
    iceCache = { config, expiresAt: Date.now() + 30_000 };
    return config;
  })();

  try {
    return await iceInflight;
  } finally {
    iceInflight = null;
  }
}

/** Warm ICE credentials before the peer connection starts (call ring phase). */
export function prefetchWebRtcIceConfiguration() {
  void fetchWebRtcIceConfiguration();
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
