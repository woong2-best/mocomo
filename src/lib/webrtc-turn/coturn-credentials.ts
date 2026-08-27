import { createHmac } from "crypto";
import type { IceServerConfig } from "@/lib/webrtc-turn/types";
import { coturnDefaultUrls, getStaticTurnServersFromEnv } from "@/lib/webrtc-turn/stun";

/** coturn REST API / time-limited credentials (HMAC-SHA1). */
export function generateCoturnCredentials(
  userId: string,
  opts?: { ttlSec?: number; host?: string; urls?: string[] }
): IceServerConfig | null {
  const secret = process.env.TURN_SECRET?.trim();
  const host = opts?.host?.trim() || process.env.COTURN_HOST?.trim();
  if (!secret || !host) return null;

  const ttlSec = Math.min(
    Math.max(parseInt(process.env.COTURN_TTL_SEC || "86400", 10) || 86400, 60),
    172800
  );
  const expiry = Math.floor(Date.now() / 1000) + (opts?.ttlSec ?? ttlSec);
  const username = `${expiry}:${userId}`;
  const credential = createHmac("sha1", secret).update(username).digest("base64");

  const urls = opts?.urls?.length ? opts.urls : coturnDefaultUrls(host);

  return {
    urls,
    username,
    credential,
  };
}

export function resolveCoturnIceServer(userId: string): IceServerConfig | null {
  const hmac = generateCoturnCredentials(userId);
  if (hmac) return hmac;

  const staticServers = getStaticTurnServersFromEnv();
  return staticServers[0] ?? null;
}
