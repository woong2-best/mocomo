"use client";

import dynamic from "next/dynamic";
import { SessionProvider } from "@/components/providers/session-provider";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { AppSocketProvider } from "@/components/providers/app-socket-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { CallProviderGate } from "@/components/call/call-provider-gate";
import { ComposeProvider } from "@/components/compose/compose-provider";
import { PublishedToastProvider } from "@/components/providers/published-toast-provider";
import { SidebarToggleProvider } from "@/components/providers/sidebar-toggle-provider";
import type { Locale } from "@/lib/i18n/config";

const PlatformBootstrapClient = dynamic(
  () =>
    import("@/components/platform-bootstrap-client").then((m) => m.PlatformBootstrapClient),
  { ssr: false }
);

const AddAccountFlowHandler = dynamic(
  () => import("@/components/auth/add-account-flow-handler").then((m) => m.AddAccountFlowHandler),
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

export function AppProviders({
  children,
  initialLocale,
  initialCountryCode,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
  initialCountryCode: string;
}) {
  return (
    <SessionProvider>
      <LocaleProvider initialLocale={initialLocale} initialCountryCode={initialCountryCode}>
        <AppSocketProvider>
          <QueryProvider>
          <PublishedToastProvider>
          <ComposeProvider>
            <SidebarToggleProvider>
              <PushRegistration />
              <NativePushRegistration />
              <CallProviderGate>
                <PlatformBootstrapClient />
                <AddAccountFlowHandler />
                {children}
              </CallProviderGate>
            </SidebarToggleProvider>
          </ComposeProvider>
          </PublishedToastProvider>
          </QueryProvider>
        </AppSocketProvider>
      </LocaleProvider>
    </SessionProvider>
  );
}
