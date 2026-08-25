import { getSession } from "next-auth/react";

const SESSION_RETRY_DELAYS_MS = [0, 250, 500, 1000, 1500];

/** Mobile Safari can lag applying Set-Cookie after OAuth/credentials login. */
export async function waitForClientSession(maxAttempts = SESSION_RETRY_DELAYS_MS.length) {
  for (let i = 0; i < maxAttempts; i++) {
    const delay = SESSION_RETRY_DELAYS_MS[i] ?? 1500;
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    const session = await getSession();
    if (session?.user?.id) return session;
  }
  return null;
}
