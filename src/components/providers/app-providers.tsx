"use client";

import dynamic from "next/dynamic";
import { SessionProvider } from "@/components/providers/session-provider";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { LocaleSessionSync } from "@/components/providers/locale-session-sync";
import { ClientTranslationProvider } from "@/components/providers/client-translation-provider";
import { AppSocketProvider } from "@/components/providers/app-socket-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { CallProviderGate } from "@/components/call/call-provider-gate";
import { ComposeProvider } from "@/components/compose/compose-provider";
import { FeedPhotoLightboxProvider } from "@/components/media/feed-photo-lightbox-provider";
import { PublishedToastProvider } from "@/components/providers/published-toast-provider";
import { SidebarToggleProvider } from "@/components/providers/sidebar-toggle-provider";
import { LegalComplianceProvider } from "@/components/providers/legal-compliance-provider";
import { TopProgressProvider } from "@/components/providers/top-progress-provider";
import { StaleDeploymentRecovery } from "@/components/providers/stale-deployment-recovery";

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

const CheckoutResumeHandler = dynamic(
  () =>
    import("@/components/payments/checkout-resume-handler").then((m) => m.CheckoutResumeHandler),
  { ssr: false }
);

const OperatorSiteMfaGate = dynamic(
  () => import("@/components/auth/operator-site-mfa-gate").then((m) => m.OperatorSiteMfaGate),
  { ssr: false }
);

const AdminSessionAutoLogout = dynamic(
  () =>
    import("@/components/auth/admin-session-auto-logout").then((m) => m.AdminSessionAutoLogout),
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
      <LocaleProvider>
        <LocaleSessionSync />
        <TopProgressProvider>
          <ClientTranslationProvider>
            <AppSocketProvider>
              <QueryProvider>
                <PublishedToastProvider>
                  <FeedPhotoLightboxProvider>
                    <ComposeProvider>
                      <SidebarToggleProvider>
                        <LegalComplianceProvider>
                          <StaleDeploymentRecovery />
                          <PushRegistration />
                          <NativePushRegistration />
                          <CheckoutResumeHandler />
                          <CallProviderGate>
                            <PlatformBootstrapClient />
                            <AddAccountFlowHandler />
                            <AdminSessionAutoLogout />
                            <OperatorSiteMfaGate />
                            {children}
                          </CallProviderGate>
                        </LegalComplianceProvider>
                      </SidebarToggleProvider>
                    </ComposeProvider>
                  </FeedPhotoLightboxProvider>
                </PublishedToastProvider>
              </QueryProvider>
            </AppSocketProvider>
          </ClientTranslationProvider>
        </TopProgressProvider>
      </LocaleProvider>
    </SessionProvider>
  );
}
