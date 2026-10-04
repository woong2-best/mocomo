"use client";

import { SessionProvider } from "@/components/providers/session-provider";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { LocaleSessionSync } from "@/components/providers/locale-session-sync";
import { ClientTranslationProvider } from "@/components/providers/client-translation-provider";
import { AppSocketProvider } from "@/components/providers/app-socket-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { OverlayAwareExtras } from "@/components/providers/overlay-aware-extras";
import { ComposeProvider } from "@/components/compose/compose-provider";
import { FeedPhotoLightboxProvider } from "@/components/media/feed-photo-lightbox-provider";
import { PublishedToastProvider } from "@/components/providers/published-toast-provider";
import { SidebarToggleProvider } from "@/components/providers/sidebar-toggle-provider";
import { LegalComplianceProvider } from "@/components/providers/legal-compliance-provider";
import { TopProgressProvider } from "@/components/providers/top-progress-provider";

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
                          <OverlayAwareExtras>{children}</OverlayAwareExtras>
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
