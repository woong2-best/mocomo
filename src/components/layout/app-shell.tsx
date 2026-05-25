"use client";

import { memo } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { AuthTopBanner } from "@/components/layout/auth-top-banner";
import { LegalFooterLinks } from "@/components/legal/legal-footer-links";

function AppShellInner({
  children,
  rightPanel,
}: {
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthRoute = pathname.startsWith("/auth");
  const isLegalRoute = pathname.startsWith("/legal");
  const isLiveRoute = pathname.startsWith("/live");
  const isMessagesRoute = pathname.startsWith("/messages");
  const isVoiceRoom = pathname.startsWith("/voice/") && pathname !== "/voice/new";
  const showRightPanel =
    !isAuthRoute && !isLegalRoute && !isLiveRoute && !isVoiceRoom && !isMessagesRoute;

  if (isAuthRoute || isLegalRoute) {
    return <main className="min-h-screen bg-background">{children}</main>;
  }

  return (
    <>
      <Header />
      <AuthTopBanner />
      <div className="flex min-h-[calc(100vh-3.5rem)]">
        <Sidebar />
        <main
          className={
            isMessagesRoute
              ? "flex-1 min-w-0 overflow-hidden bg-background pb-16 lg:pb-0"
              : "flex-1 min-w-0 overflow-y-auto bg-background pb-16 lg:pb-0"
          }
        >
          {children}
        </main>
        {showRightPanel ? rightPanel : null}
      </div>
      <MobileNav />
      {!isMessagesRoute && (
        <footer className="hidden lg:block border-t border-border py-3 px-4 bg-muted/20">
          <LegalFooterLinks />
        </footer>
      )}
    </>
  );
}

export const AppShell = memo(AppShellInner);
