/**
 * Admin MFA / session cookies (Edge-safe HMAC).
 * stages: pw (password) → pk (passkey) → ok (full MFA)
 */

import { getAuthSecret } from "@/lib/auth-env";

export const ADMIN_MFA_COOKIE =
  process.env.NODE_ENV === "production"
    ? "__Secure-mocomo-admin-mfa"
    : "mocomo-admin-mfa";

export const ADMIN_TRUSTED_COOKIE =
  process.env.NODE_ENV === "production"
    ? "__Secure-mocomo-admin-trusted"
    : "mocomo-admin-trusted";

export const ADMIN_STEPUP_COOKIE =
  process.env.NODE_ENV === "production"
    ? "__Secure-mocomo-admin-stepup"
    : "mocomo-admin-stepup";

/** 단계별 챌린지 유효 (비밀번호/Passkey 중간) */
export const ADMIN_MFA_CHALLENGE_TTL_SEC = 10 * 60;

/** 완전 인증 후 유휴 만료 */
export const ADMIN_MFA_IDLE_TTL_SEC = 30 * 60;

/** Step-up 재인증 유효 */
export const ADMIN_STEPUP_TTL_SEC = 5 * 60;

/** Trusted device */
export const ADMIN_TRUSTED_TTL_SEC = 30 * 24 * 60 * 60;

export type AdminMfaStage = "pw" | "pk" | "ok";

export type AdminMfaPayload = {
  userId: string;
  stage: AdminMfaStage;
  exp: number;
  activityExp: number;
};

function toBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function hmacSha256(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return toBase64Url(sig);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export function adminSecurityCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge,
  };
}

export async function createAdminMfaCookieValue(
  userId: string,
  stage: AdminMfaStage,
  ttlSec = stage === "ok" ? ADMIN_MFA_IDLE_TTL_SEC : ADMIN_MFA_CHALLENGE_TTL_SEC
): Promise<string> {
  const secret = getAuthSecret();
  if (!secret) throw new Error("AUTH_SECRET missing");
  const now = Math.floor(Date.now() / 1000);
  const exp = now + Math.max(ttlSec, ADMIN_MFA_IDLE_TTL_SEC);
  const activityExp = stage === "ok" ? now + ADMIN_MFA_IDLE_TTL_SEC : now + ttlSec;
  const hardExp = stage === "ok" ? now + 12 * 60 * 60 : activityExp;
  const payload = `${userId}.${stage}.${hardExp}.${activityExp}`;
  const sig = await hmacSha256(secret, payload);
  return `v2.${payload}.${sig}`;
}

export async function parseAdminMfaCookieValue(
  value: string | undefined | null
): Promise<AdminMfaPayload | null> {
  if (!value) return null;
  const secret = getAuthSecret();
  if (!secret) return null;
  const parts = value.split(".");
  // v2.userId.stage.exp.activityExp.sig
  if (parts.length !== 6 || parts[0] !== "v2") return null;
  const userId = parts[1]!;
  const stage = parts[2] as AdminMfaStage;
  const exp = Number(parts[3]);
  const activityExp = Number(parts[4]);
  const signature = parts[5]!;
  if (!userId || !["pw", "pk", "ok"].includes(stage)) return null;
  if (!Number.isFinite(exp) || !Number.isFinite(activityExp)) return null;
  const now = Math.floor(Date.now() / 1000);
  if (exp < now || activityExp < now) return null;
  const expected = await hmacSha256(secret, `${userId}.${stage}.${exp}.${activityExp}`);
  if (!timingSafeEqual(signature, expected)) return null;
  return { userId, stage, exp, activityExp };
}

export async function verifyAdminMfaCookieValue(
  value: string | undefined | null,
  expectedUserId: string,
  minStage: AdminMfaStage = "ok"
): Promise<boolean> {
  const parsed = await parseAdminMfaCookieValue(value);
  if (!parsed || parsed.userId !== expectedUserId) return false;
  const order: AdminMfaStage[] = ["pw", "pk", "ok"];
  return order.indexOf(parsed.stage) >= order.indexOf(minStage);
}

export async function createAdminStepUpCookieValue(userId: string): Promise<string> {
  const secret = getAuthSecret();
  if (!secret) throw new Error("AUTH_SECRET missing");
  const now = Math.floor(Date.now() / 1000);
  const exp = now + ADMIN_STEPUP_TTL_SEC;
  const payload = `${userId}.${exp}`;
  const sig = await hmacSha256(secret, `stepup:${payload}`);
  return `su1.${payload}.${sig}`;
}

export async function verifyAdminStepUpCookieValue(
  value: string | undefined | null,
  expectedUserId: string
): Promise<boolean> {
  if (!value) return false;
  const secret = getAuthSecret();
  if (!secret) return false;
  const parts = value.split(".");
  if (parts.length !== 4 || parts[0] !== "su1") return false;
  const userId = parts[1]!;
  const exp = Number(parts[2]);
  const sig = parts[3]!;
  if (userId !== expectedUserId || !Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
    return false;
  }
  const expected = await hmacSha256(secret, `stepup:${userId}.${exp}`);
  return timingSafeEqual(sig, expected);
}
