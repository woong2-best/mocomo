"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { LocalHomeSessionSync } from "@/components/providers/local-home-session-sync";
import { LocaleSessionSync } from "@/components/providers/locale-session-sync";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      <LocalHomeSessionSync />
      <LocaleSessionSync />
      {children}
    </NextAuthSessionProvider>
  );
}
