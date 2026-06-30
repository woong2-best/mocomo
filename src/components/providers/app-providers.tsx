"use client";

import dynamic from "next/dynamic";
import { SessionProvider } from "@/components/providers/session-provider";
import { AppSocketProvider } from "@/components/providers/app-socket-provider";
import { CallProviderGate } from "@/components/call/call-provider-gate";
import { ComposeProvider } from "@/components/compose/compose-provider";
import { SidebarToggleProvider } from "@/components/providers/sidebar-toggle-provider";

const PlatformBootstrapClient = dynamic(
  () =>
    import("@/components/platform-bootstrap-client").then((m) => m.PlatformBootstrapClient),
  { ssr: false }
);

const PushRegistration = dynamic(
  () => import("@/components/push/push-registration").then((m) => m.PushRegistration),
  { ssr: false }
);

const NativePushRegistration = dynamic(
  () =>
    import("@/components/push/native-push-registration").then((m) => m.NativePushRegistration),
  { ssr: false }
);

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AppSocketProvider>
      <ComposeProvider>
        <SidebarToggleProvider>
        <PushRegistration />
        <NativePushRegistration />
        <CallProviderGate>
          <PlatformBootstrapClient />
          {children}
        </CallProviderGate>
        </SidebarToggleProvider>
      </ComposeProvider>
      </AppSocketProvider>
    </SessionProvider>
  );
}
