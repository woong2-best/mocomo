"use client";

import {
  googleStunRtcConfiguration,
  P2P_STUN_ICE_CONFIG,
} from "@/lib/peer-call/p2p-ice";
import type { ResolvedIceConfig } from "@/lib/webrtc-turn/types";

export type { IceServerConfig } from "@/lib/webrtc-turn/types";

/** Google STUN only. TURN env / paid relay is never used. */
export function getClientFallbackIceConfig(): ResolvedIceConfig {
  return P2P_STUN_ICE_CONFIG;
}

export async function fetchWebRtcIceConfiguration(): Promise<RTCConfiguration> {
  return googleStunRtcConfiguration();
}

/** Warm ICE before the peer connection starts (call ring phase). */
export function prefetchWebRtcIceConfiguration() {
  /* local STUN constants — no network */
}

/** @deprecated use fetchWebRtcIceConfiguration */
export function getWebRtcIceServers() {
  return P2P_STUN_ICE_CONFIG.iceServers;
}

/** @deprecated use fetchWebRtcIceConfiguration */
export function getRtcConfiguration(): RTCConfiguration {
  return googleStunRtcConfiguration();
}
