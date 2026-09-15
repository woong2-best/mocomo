"use client";

import { useSession } from "next-auth/react";

/**
 * Auth state safe for chrome (header, tabs, home hero).
 * During `loading`, prefer SSR hint or hydrated session — never assume guest.
 */
export function useAuthReady(serverLoggedIn = false) {
  const { data: session, status } = useSession();
  const pending = status === "loading";
  const authenticated =
    status === "unauthenticated"
      ? false
      : Boolean(session?.user) || (pending && serverLoggedIn);

  return {
    session,
    status,
    pending,
    authenticated,
    user: session?.user,
  };
}
