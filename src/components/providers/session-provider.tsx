"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { AccountSwitchSync } from "@/components/providers/account-switch-sync";
import { LocalHomeSessionSync } from "@/components/providers/local-home-session-sync";
import { LocaleSessionSync } from "@/components/providers/locale-session-sync";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      <AccountSwitchSync />
      <LocalHomeSessionSync />
      <LocaleSessionSync />
      {children}
    </NextAuthSessionProvider>
  );
}
