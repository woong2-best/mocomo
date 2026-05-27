import { createHmac, timingSafeEqual } from "crypto";
import { getAuthSecret } from "@/lib/auth-env";

const TTL_MS = 5 * 60 * 1000;

function sign(payload: string): string {
  return createHmac("sha256", getAuthSecret()).update(payload).digest("base64url");
}

export function createSocketAuthToken(userId: string): string {
  const exp = Date.now() + TTL_MS;
  const payload = `${userId}.${exp}`;
  return `${Buffer.from(payload, "utf8").toString("base64url")}.${sign(payload)}`;
}

export function verifySocketAuthToken(token: string | undefined | null): string | null {
  if (!token?.includes(".")) return null;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;

  let payload: string;
  try {
    payload = Buffer.from(payloadB64, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const expected = sign(payload);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  const [userId, expStr] = payload.split(".");
  const exp = Number(expStr);
  if (!userId || !Number.isFinite(exp) || exp < Date.now()) return null;
  return userId;
}
