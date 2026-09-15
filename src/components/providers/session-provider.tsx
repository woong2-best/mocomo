"use client";

import type { Session } from "next-auth";
import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { AccountSwitchSync } from "@/components/providers/account-switch-sync";
import { LocalHomeSessionSync } from "@/components/providers/local-home-session-sync";
import { LocaleSessionSync } from "@/components/providers/locale-session-sync";

export function SessionProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session?: Session | null;
}) {
  return (
    <NextAuthSessionProvider
      session={session}
      refetchOnWindowFocus={false}
      refetchInterval={0}
    >
      <AccountSwitchSync />
      <LocalHomeSessionSync />
      <LocaleSessionSync />
      {children}
    </NextAuthSessionProvider>
  );
}
