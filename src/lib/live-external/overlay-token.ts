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
};

const CHAT_TTL_SEC = 48 * 3600;
const DONATION_TTL_SEC = 7 * 24 * 3600;

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
  opts?: { broadcastSid?: number; ttlSec?: number }
): string | null {
  const sec = secret();
  if (!sec) return null;
  const ttl = opts?.ttlSec ?? (kind === "chat" ? CHAT_TTL_SEC : DONATION_TTL_SEC);
  const payload: OverlayTokenPayload = {
    channelId,
    kind,
    exp: Math.floor(Date.now() / 1000) + ttl,
    ...(opts?.broadcastSid != null ? { broadcastSid: opts.broadcastSid } : {}),
  };
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(createHmac("sha256", sec).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyOverlayToken(
  token: string,
  expected: { channelId: string; kind: "chat" | "donation" }
): { ok: true; payload: OverlayTokenPayload } | { ok: false; error: string } {
  const sec = secret();
  if (!sec) return { ok: false, error: "오버레이 시크릿이 설정되지 않았습니다." };
  const [body, sig] = token.split(".");
  if (!body || !sig) return { ok: false, error: "토큰 형식이 올바르지 않습니다." };
  const expectSig = b64url(createHmac("sha256", sec).update(body).digest());
  try {
    const a = fromB64url(sig);
    const b = fromB64url(expectSig);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, error: "토큰 서명이 올바르지 않습니다." };
    }
  } catch {
    return { ok: false, error: "토큰 서명이 올바르지 않습니다." };
  }
  let payload: OverlayTokenPayload;
  try {
    payload = JSON.parse(fromB64url(body).toString("utf8")) as OverlayTokenPayload;
  } catch {
    return { ok: false, error: "토큰을 읽을 수 없습니다." };
  }
  if (payload.channelId !== expected.channelId || payload.kind !== expected.kind) {
    return { ok: false, error: "토큰 대상이 일치하지 않습니다." };
  }
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    return { ok: false, error: "토큰이 만료되었습니다." };
  }
  return { ok: true, payload };
}
