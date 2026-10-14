import { getAuthSecret } from "@/lib/auth-env";

/** HttpOnly proof that this browser accepted the required Terms version. */
export const TERMS_ACK_COOKIE = "mocomo_terms_ack";

const ACK_MAX_AGE_SEC = 60 * 60 * 24 * 400;

export function termsAckCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: ACK_MAX_AGE_SEC,
  };
}

async function hmacHex(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sealTermsAck(versionTag: string): Promise<string | null> {
  const version = versionTag.trim();
  const secret = getAuthSecret();
  if (!version || !secret) return null;
  const mac = await hmacHex(secret, version);
  return `${version}.${mac}`;
}

export async function readTermsAck(raw: string | undefined | null): Promise<string | null> {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const version = raw.slice(0, dot);
  const mac = raw.slice(dot + 1);
  const secret = getAuthSecret();
  if (!version || !secret || !mac) return null;
  const expected = await hmacHex(secret, version);
  if (expected.length !== mac.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ mac.charCodeAt(i);
  }
  return diff === 0 ? version : null;
}
