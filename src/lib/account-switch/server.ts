import { decode, encode } from "@auth/core/jwt";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getAuthSecret } from "@/lib/auth-env";
import { sessionCookieName } from "@/lib/account-switch/constants";

const SESSION_MAX_AGE = 30 * 24 * 60 * 60;
const useSecureCookies = process.env.NODE_ENV === "production";

export async function readSessionTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(sessionCookieName())?.value ?? null;
}

export async function decodeSessionToken(token: string) {
  const secret = getAuthSecret();
  if (!secret) return null;
  try {
    return await decode({
      token,
      secret,
      salt: sessionCookieName(),
    });
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: useSecureCookies,
    maxAge: SESSION_MAX_AGE,
  });
}

export async function encodeSessionFromPayload(payload: Record<string, unknown>) {
  const secret = getAuthSecret();
  if (!secret) return null;
  return encode({
    token: payload,
    secret,
    salt: sessionCookieName(),
    maxAge: SESSION_MAX_AGE,
  });
}

export async function validateSwitchToken(userId: string, switchToken: string) {
  const payload = await decodeSessionToken(switchToken);
  if (!payload) return { ok: false as const, error: "INVALID_TOKEN" };

  const tokenUserId = (payload.id ?? payload.sub) as string | undefined;
  if (!tokenUserId || tokenUserId !== userId) {
    return { ok: false as const, error: "USER_MISMATCH" };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      isBanned: true,
    },
  });
  if (!user) return { ok: false as const, error: "USER_NOT_FOUND" };
  if (user.isBanned) return { ok: false as const, error: "BANNED" };

  return { ok: true as const, user, payload };
}
