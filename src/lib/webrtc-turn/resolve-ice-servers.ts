import type { IceServerConfig, ResolvedIceConfig } from "@/lib/webrtc-turn/types";
import {
  getIceTransportPolicyFromEnv,
  getStaticTurnServersFromEnv,
  normalizeTurnProvider,
} from "@/lib/webrtc-turn/stun";
import { resolveCoturnIceServer } from "@/lib/webrtc-turn/coturn-credentials";
import { resolveCloudflareTurnServer } from "@/lib/webrtc-turn/cloudflare-turn";

/** 1st choice. Direct/srflx candidates are gathered from this STUN server. */
const GOOGLE_PUBLIC_STUN: IceServerConfig = { urls: "stun:stun.l.google.com:19302" };

export async function resolveIceServersForCall(userId: string): Promise<ResolvedIceConfig> {
  const provider = normalizeTurnProvider(process.env.TURN_PROVIDER);
  const iceTransportPolicy = getIceTransportPolicyFromEnv();
  const servers: IceServerConfig[] = [GOOGLE_PUBLIC_STUN];

  if (provider === "static") {
    servers.push(...getStaticTurnServersFromEnv());
  } else if (provider === "coturn") {
    const turn = resolveCoturnIceServer(userId);
    if (turn) servers.push(turn);
  } else if (provider === "cloudflare") {
    const turn = await resolveCloudflareTurnServer();
    if (turn) servers.push(turn);
  }

  return { iceServers: dedupeIceServers(servers), iceTransportPolicy };
}

function dedupeIceServers(servers: IceServerConfig[]): IceServerConfig[] {
  const seen = new Set<string>();
  const out: IceServerConfig[] = [];
  for (const s of servers) {
    const key = JSON.stringify(s);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

export function isTurnConfigured(): boolean {
  const provider = normalizeTurnProvider(process.env.TURN_PROVIDER);
  if (provider === "none") return false;
  if (provider === "static") return getStaticTurnServersFromEnv().length > 0;
  if (provider === "coturn") {
    return !!(process.env.TURN_SECRET && process.env.COTURN_HOST) || getStaticTurnServersFromEnv().length > 0;
  }
  if (provider === "cloudflare") {
    return !!(
      (process.env.CLOUDFLARE_TURN_KEY_ID && process.env.CLOUDFLARE_TURN_KEY_TOKEN) ||
      (process.env.CLOUDFLARE_TURN_USERNAME && process.env.CLOUDFLARE_TURN_CREDENTIAL)
    );
  }
  return false;
}
