import type { NextResponse } from "next/server";

const useSecureCookies = process.env.NODE_ENV === "production";

/** Auth.js v5 + legacy NextAuth v4 session cookie names. */
export const SESSION_COOKIE_BASE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
] as const;

/** Auth.js auxiliary cookies — stale values can confuse client signOut. */
const AUTH_AUX_COOKIE_BASE_NAMES = [
  "authjs.csrf-token",
  "__Secure-authjs.csrf-token",
  "authjs.callback-url",
  "__Secure-authjs.callback-url",
  "next-auth.csrf-token",
  "__Secure-next-auth.csrf-token",
  "next-auth.callback-url",
  "__Secure-next-auth.callback-url",
] as const;

/** Auth.js splits large JWTs into `.0`, `.1`, … suffix cookies. */
const MAX_SESSION_COOKIE_CHUNKS = 12;

export function sessionCookieName(): string {
  return useSecureCookies ? "__Secure-authjs.session-token" : "authjs.session-token";
}

export function allSessionCookieNames(): string[] {
  const names: string[] = [];
  for (const base of SESSION_COOKIE_BASE_NAMES) {
    names.push(base);
    for (let i = 0; i < MAX_SESSION_COOKIE_CHUNKS; i++) {
      names.push(`${base}.${i}`);
    }
  }
  for (const base of AUTH_AUX_COOKIE_BASE_NAMES) {
    names.push(base);
  }
  return names;
}

const CLEAR_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: useSecureCookies,
  maxAge: 0,
} as const;

/** Purge every known session cookie variant on a Route Handler response. */
export function clearSessionCookiesOnResponse(res: NextResponse) {
  for (const name of allSessionCookieNames()) {
    res.cookies.set(name, "", CLEAR_COOKIE_OPTS);
  }
}

/** Purge every known session cookie variant (legacy names + JWT chunks). */
export async function clearAllSessionCookies() {
  const { cookies } = await import("next/headers");
  const jar = await cookies();

  for (const name of allSessionCookieNames()) {
    jar.set(name, "", CLEAR_COOKIE_OPTS);
  }
}
