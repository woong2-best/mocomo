import { createHmac, timingSafeEqual } from "crypto";
import { isSafeReturnPath } from "@/lib/safe-link";

const HANDOFF_TTL_MS = 3 * 60 * 1000;

function secret(): string {
  const raw =
    process.env.MOBILE_JWT_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    "";
  if (!raw || raw.length < 16) {
    throw new Error("MOBILE_JWT_SECRET or AUTH_SECRET required for mobile web session handoff");
  }
  return `mobile-web-session:${raw}`;
}

export type MobileWebSessionHandoff = {
  userId: string;
  redirect: string;
  exp: number;
};

function sign(bodyB64: string): string {
  return createHmac("sha256", secret()).update(bodyB64).digest("base64url");
}

export function sealMobileWebSessionHandoff(payload: {
  userId: string;
  redirect: string;
}): string {
  const full: MobileWebSessionHandoff = {
    ...payload,
    exp: Date.now() + HANDOFF_TTL_MS,
  };
  const bodyB64 = Buffer.from(JSON.stringify(full), "utf8").toString("base64url");
  return `${bodyB64}.${sign(bodyB64)}`;
}

export function openMobileWebSessionHandoff(sealed: string): MobileWebSessionHandoff | null {
  const parts = sealed.split(".");
  if (parts.length !== 2) return null;
  const [bodyB64, sig] = parts;
  if (!bodyB64 || !sig) return null;
  const expected = sign(bodyB64);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(bodyB64, "base64url").toString("utf8")
    ) as MobileWebSessionHandoff;
    if (!parsed?.userId || !parsed?.redirect) return null;
    if (typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
    if (!isSafeReturnPath(parsed.redirect)) return null;
    return parsed;
  } catch {
    return null;
  }
}
