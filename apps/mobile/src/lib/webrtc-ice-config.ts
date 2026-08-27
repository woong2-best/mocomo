import Constants from "expo-constants";
import { apiRequest } from "@/api/client";

export type IceServerConfig = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

type ResolvedIceConfig = {
  iceServers: IceServerConfig[];
  iceTransportPolicy?: RTCIceTransportPolicy;
};

const DEFAULT_STUN: IceServerConfig[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

function parseIceServersJson(raw: string | undefined): IceServerConfig[] | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as IceServerConfig[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed.filter((s) => s?.urls);
  } catch {
    return null;
  }
}

function getExpoExtra() {
  return (Constants.expoConfig?.extra ?? {}) as {
    stunServers?: string;
    turnServers?: string;
  };
}

/** Client-side fallback when API unavailable. */
export function getMobileFallbackIceConfig(): ResolvedIceConfig {
  const extra = getExpoExtra();
  const stun =
    parseIceServersJson(process.env.EXPO_PUBLIC_STUN_SERVERS) ??
    parseIceServersJson(extra.stunServers) ??
    DEFAULT_STUN;
  const servers = [...stun];

  const turnJson =
    parseIceServersJson(process.env.EXPO_PUBLIC_TURN_SERVERS) ??
    parseIceServersJson(extra.turnServers);
  if (turnJson?.length) servers.push(...turnJson);

  const legacyUrl = process.env.EXPO_PUBLIC_TURN_URL?.trim();
  if (legacyUrl) {
    servers.push({
      urls: legacyUrl,
      username: process.env.EXPO_PUBLIC_TURN_USERNAME,
      credential: process.env.EXPO_PUBLIC_TURN_CREDENTIAL,
    });
  }

  const policyRaw = process.env.EXPO_PUBLIC_WEBRTC_ICE_TRANSPORT_POLICY?.trim();
  const iceTransportPolicy = policyRaw === "relay" || policyRaw === "all" ? policyRaw : undefined;

  return { iceServers: servers, iceTransportPolicy };
}

export async function fetchMobileWebRtcIceConfiguration(): Promise<{
  iceServers: IceServerConfig[];
  iceTransportPolicy?: RTCIceTransportPolicy;
}> {
  try {
    const data = await apiRequest<ResolvedIceConfig & { turnEnabled?: boolean }>(
      "/api/mobile/webrtc/ice-servers",
      { auth: true }
    );
    return {
      iceServers: data.iceServers,
      ...(data.iceTransportPolicy ? { iceTransportPolicy: data.iceTransportPolicy } : {}),
    };
  } catch {
    const fallback = getMobileFallbackIceConfig();
    return {
      iceServers: fallback.iceServers,
      ...(fallback.iceTransportPolicy ? { iceTransportPolicy: fallback.iceTransportPolicy } : {}),
    };
  }
}

export function getRtcConfiguration() {
  const fallback = getMobileFallbackIceConfig();
  return {
    iceServers: fallback.iceServers,
    ...(fallback.iceTransportPolicy ? { iceTransportPolicy: fallback.iceTransportPolicy } : {}),
  };
}
