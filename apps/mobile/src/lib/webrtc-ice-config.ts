import {
  GOOGLE_STUN_ICE_SERVERS,
  googleStunRtcConfiguration,
  type IceServerConfig,
} from "@/lib/p2p-ice";

export type { IceServerConfig };

type ResolvedIceConfig = {
  iceServers: IceServerConfig[];
};

/** Google STUN only. TURN env / paid relay is never used. */
export function getMobileFallbackIceConfig(): ResolvedIceConfig {
  return { iceServers: GOOGLE_STUN_ICE_SERVERS };
}

export async function fetchMobileWebRtcIceConfiguration(): Promise<ResolvedIceConfig> {
  return googleStunRtcConfiguration();
}

export function getRtcConfiguration() {
  return googleStunRtcConfiguration();
}
