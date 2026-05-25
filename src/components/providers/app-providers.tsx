"use client";

import dynamic from "next/dynamic";
import { SessionProvider } from "@/components/providers/session-provider";

const CallProvider = dynamic(
  () => import("@/components/call/call-provider").then((m) => m.CallProvider),
  { ssr: false }
);

const PlatformBootstrapClient = dynamic(
  () =>
    import("@/components/platform-bootstrap-client").then((m) => m.PlatformBootstrapClient),
  { ssr: false }
);

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CallProvider>
        <PlatformBootstrapClient />
        {children}
      </CallProvider>
    </SessionProvider>
  );
}
