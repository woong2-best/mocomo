const useSecureCookies = process.env.NODE_ENV === "production";

/** Auth.js v5 + legacy NextAuth v4 session cookie names. */
export const SESSION_COOKIE_BASE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
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
  return names;
}

/** Purge every known session cookie variant (legacy names + JWT chunks). */
export async function clearAllSessionCookies() {
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  const opts = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: useSecureCookies,
    maxAge: 0,
  };

  for (const name of allSessionCookieNames()) {
    jar.set(name, "", opts);
  }
}
