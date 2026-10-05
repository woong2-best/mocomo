import { P2P_STUN_ICE_CONFIG } from "@/lib/peer-call/p2p-ice";
import type { ResolvedIceConfig } from "@/lib/webrtc-turn/types";

/** DM P2P uses Google STUN only. TURN providers are disabled to keep relay cost at 0. */
export async function resolveIceServersForCall(_userId: string): Promise<ResolvedIceConfig> {
  return P2P_STUN_ICE_CONFIG;
}

export function isTurnConfigured(): boolean {
  return false;
}
