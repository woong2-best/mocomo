"use client";

import dynamic from "next/dynamic";
import { SessionProvider } from "@/components/providers/session-provider";
import { CallProviderGate } from "@/components/call/call-provider-gate";

const PlatformBootstrapClient = dynamic(
  () =>
    import("@/components/platform-bootstrap-client").then((m) => m.PlatformBootstrapClient),
  { ssr: false }
);

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CallProviderGate>
        <PlatformBootstrapClient />
        {children}
      </CallProviderGate>
    </SessionProvider>
  );
}
