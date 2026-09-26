import type { IceServerConfig } from "@/lib/webrtc-turn/types";
import { filterBrowserBlockedTurnUrls } from "@/lib/webrtc-turn/stun";

type CloudflareIceBlock = {
  urls?: string | string[];
  username?: string;
  credential?: string;
};

type CloudflareIceResponse = {
  iceServers?: CloudflareIceBlock | CloudflareIceBlock[];
};

function normalizeCloudflareBlocks(data: CloudflareIceResponse): CloudflareIceBlock[] {
  const raw = data.iceServers;
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

/** Cloudflare Returns STUN + TURN blocks; port 53 URLs are stripped (browser-blocked). */
export async function fetchCloudflareIceServers(_userId: string): Promise<IceServerConfig[]> {
  const keyId = process.env.CLOUDFLARE_TURN_KEY_ID?.trim();
  const token = process.env.CLOUDFLARE_TURN_KEY_TOKEN?.trim();
  if (!keyId || !token) return [];

  const ttl = Math.min(
    Math.max(parseInt(process.env.CLOUDFLARE_TURN_TTL_SEC || "3600", 10) || 3600, 60),
    172800
  );

  const res = await fetch(
    `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ttl }),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    console.error("[cloudflare-turn]", res.status, await res.text().catch(() => ""));
    return [];
  }

  const data = (await res.json()) as CloudflareIceResponse;
  const out: IceServerConfig[] = [];

  for (const block of normalizeCloudflareBlocks(data)) {
    if (!block.urls) continue;
    const urls = filterBrowserBlockedTurnUrls(block.urls);
    const list = Array.isArray(urls) ? urls : [urls];
    if (list.length === 0) continue;

    out.push({
      urls: list.length === 1 ? list[0]! : list,
      ...(block.username ? { username: block.username } : {}),
      ...(block.credential ? { credential: block.credential } : {}),
    });
  }

  return out;
}

export function cloudflareStunServer(): IceServerConfig {
  return { urls: "stun:stun.cloudflare.com:3478" };
}

/** Canonical Cloudflare Realtime TURN. Credentials come from the TURN key API or env. */
export const CLOUDFLARE_TURN_URLS = [
  "turn:turn.cloudflare.com:3478",
  "turn:turn.cloudflare.com:3478?transport=udp",
  "turn:turn.cloudflare.com:3478?transport=tcp",
  "turns:turn.cloudflare.com:5349?transport=tcp",
];

export function cloudflareTurnServer(username: string, credential: string): IceServerConfig {
  return {
    urls: CLOUDFLARE_TURN_URLS,
    username,
    credential,
  };
}

/**
 * Fallback relay after Google STUN.
 * Prefers short-lived credentials from CLOUDFLARE_TURN_KEY_ID / CLOUDFLARE_TURN_KEY_TOKEN.
 * CLOUDFLARE_TURN_USERNAME + CLOUDFLARE_TURN_CREDENTIAL are a static override.
 */
export async function resolveCloudflareTurnServer(): Promise<IceServerConfig | null> {
  const keyId = process.env.CLOUDFLARE_TURN_KEY_ID?.trim();
  const token = process.env.CLOUDFLARE_TURN_KEY_TOKEN?.trim();
  if (keyId && token) {
    const blocks = await fetchCloudflareIceServers("dm-voice");
    const creds = blocks.find((block) => block.username && block.credential);
    if (creds?.username && creds.credential) {
      return cloudflareTurnServer(creds.username, creds.credential);
    }
  }

  const username = process.env.CLOUDFLARE_TURN_USERNAME?.trim();
  const credential = process.env.CLOUDFLARE_TURN_CREDENTIAL?.trim();
  if (username && credential) return cloudflareTurnServer(username, credential);
  return null;
}
