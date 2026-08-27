import type { IceServerConfig, ResolvedIceConfig } from "@/lib/webrtc-turn/types";
import {
  getIceTransportPolicyFromEnv,
  getStunServersFromEnv,
  getStaticTurnServersFromEnv,
  normalizeTurnProvider,
} from "@/lib/webrtc-turn/stun";
import { resolveCoturnIceServer } from "@/lib/webrtc-turn/coturn-credentials";
import { cloudflareStunServer, fetchCloudflareIceServers } from "@/lib/webrtc-turn/cloudflare-turn";

export async function resolveIceServersForCall(userId: string): Promise<ResolvedIceConfig> {
  const provider = normalizeTurnProvider(process.env.TURN_PROVIDER);
  const iceTransportPolicy = getIceTransportPolicyFromEnv();
  const stun = getStunServersFromEnv();
  const servers: IceServerConfig[] = [...stun];

  if (provider === "none") {
    return { iceServers: servers, iceTransportPolicy };
  }

  if (provider === "static") {
    servers.push(...getStaticTurnServersFromEnv());
    return { iceServers: dedupeIceServers(servers), iceTransportPolicy };
  }

  if (provider === "coturn") {
    const turn = resolveCoturnIceServer(userId);
    if (turn) servers.push(turn);
    return { iceServers: dedupeIceServers(servers), iceTransportPolicy };
  }

  if (provider === "cloudflare") {
    const cf = await fetchCloudflareIceServers(userId);
    if (cf.length) {
      servers.length = 0;
      servers.push(...cf);
    } else {
      servers.push(cloudflareStunServer());
    }
    return { iceServers: dedupeIceServers(servers), iceTransportPolicy };
  }

  return { iceServers: servers, iceTransportPolicy };
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
    return !!(process.env.CLOUDFLARE_TURN_KEY_ID && process.env.CLOUDFLARE_TURN_KEY_TOKEN);
  }
  return false;
}
