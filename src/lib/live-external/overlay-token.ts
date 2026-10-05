import { createHmac, timingSafeEqual } from "crypto";

function secret(): string {
  return (
    process.env.LIVE_OVERLAY_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    ""
  );
}

export type OverlayTokenPayload = {
  channelId: string;
  kind: "chat" | "donation";
  /** unix seconds */
  exp: number;
  /** VoiceChannel.createdAt unix sec — binds token to one broadcast session */
  broadcastSid?: number;
  /** Set on Live Studio links. Equals channelId and follows the host's current broadcast. */
  hostUserId?: string;
};

const CHAT_TTL_SEC = 48 * 3600;
const DONATION_TTL_SEC = 7 * 24 * 3600;
/** Far-future exp so Live Studio OBS URLs are byte-identical every time they are copied. */
const HOST_OVERLAY_STABLE_EXP = Math.floor(Date.UTC(2035, 0, 1) / 1000);

function b64url(buf: Buffer | string): string {
  const b = typeof buf === "string" ? Buffer.from(buf, "utf8") : buf;
  return b
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromB64url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export function overlayBroadcastSid(createdAt: Date): number {
  return Math.floor(createdAt.getTime() / 1000);
}

/** Signed read-only token for OBS browser sources. */
export function mintOverlayToken(
  channelId: string,
  kind: "chat" | "donation",
  opts?: { broadcastSid?: number; ttlSec?: number; exp?: number; hostUserId?: string }
): string | null {
  const sec = secret();
  if (!sec) return null;
  const ttl = opts?.ttlSec ?? (kind === "chat" ? CHAT_TTL_SEC : DONATION_TTL_SEC);
  const payload: OverlayTokenPayload = {
    channelId,
    kind,
    exp: opts?.exp ?? Math.floor(Date.now() / 1000) + ttl,
    ...(opts?.broadcastSid != null ? { broadcastSid: opts.broadcastSid } : {}),
    ...(opts?.hostUserId ? { hostUserId: opts.hostUserId } : {}),
  };
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(createHmac("sha256", sec).update(body).digest());
  return `${body}.${sig}`;
}

/** Live Studio browser source. Same URL for every broadcast of this host. */
export function mintHostOverlayToken(
  hostUserId: string,
  kind: "chat" | "donation"
): string | null {
  return mintOverlayToken(hostUserId, kind, {
    hostUserId,
    exp: HOST_OVERLAY_STABLE_EXP,
  });
}

function parseOverlayToken(
  token: string
): { ok: true; payload: OverlayTokenPayload } | { ok: false; error: string } {
  const sec = secret();
  if (!sec) return { ok: false, error: "Overlay secret is not configured." };
  const [body, sig] = token.split(".");
  if (!body || !sig) return { ok: false, error: "Invalid token format." };
  const expectSig = b64url(createHmac("sha256", sec).update(body).digest());
  try {
    const a = fromB64url(sig);
    const b = fromB64url(expectSig);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, error: "Invalid token signature." };
    }
  } catch {
    return { ok: false, error: "Invalid token signature." };
  }
  try {
    const payload = JSON.parse(fromB64url(body).toString("utf8")) as OverlayTokenPayload;
    return { ok: true, payload };
  } catch {
    return { ok: false, error: "Could not read token." };
  }
}

export function verifyOverlayToken(
  token: string,
  expected: { channelId: string; kind: "chat" | "donation" }
): { ok: true; payload: OverlayTokenPayload } | { ok: false; error: string } {
  const parsed = parseOverlayToken(token);
  if (!parsed.ok) return parsed;
  const { payload } = parsed;
  if (payload.channelId !== expected.channelId || payload.kind !== expected.kind) {
    return { ok: false, error: "Token audience does not match." };
  }
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    return { ok: false, error: "Token expired." };
  }
  return { ok: true, payload };
}

export function verifyHostOverlayToken(
  token: string,
  kind: "chat" | "donation"
): { ok: true; payload: OverlayTokenPayload & { hostUserId: string } } | { ok: false; error: string } {
  const parsed = parseOverlayToken(token);
  if (!parsed.ok) return parsed;
  const { payload } = parsed;
  if (!payload.hostUserId || payload.hostUserId !== payload.channelId || payload.kind !== kind) {
    return { ok: false, error: "Token audience does not match." };
  }
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    return { ok: false, error: "Token expired." };
  }
  return { ok: true, payload: { ...payload, hostUserId: payload.hostUserId } };
}
