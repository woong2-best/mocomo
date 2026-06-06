"use client";

import { memo } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { AuthTopBanner } from "@/components/layout/auth-top-banner";
import { LegalFooterLinks } from "@/components/legal/legal-footer-links";
import { mainScrollPaddingClass, shouldHideMobileNav } from "@/lib/mobile-shell";

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
  const isUsedRoute = pathname.startsWith("/used");
  const isVoiceRoom = pathname.startsWith("/voice/") && pathname !== "/voice/new";
  const hideMobileNav = shouldHideMobileNav(pathname);
  const mainPb = mainScrollPaddingClass(pathname);
  const showRightPanel =
    !isAuthRoute && !isLegalRoute && !isLiveRoute && !isVoiceRoom && !isMessagesRoute && !isUsedRoute;

  if (isAuthRoute || isLegalRoute) {
    return <main className="min-h-screen bg-background">{children}</main>;
  }

  if (isVoiceRoom) {
    return <main className="min-h-screen bg-background">{children}</main>;
  }

  return (
    <>
      <Header />
      <AuthTopBanner />
      <div className="flex min-h-app">
        <Sidebar />
        <main
          className={
            isMessagesRoute
              ? `flex-1 min-w-0 overflow-hidden bg-background ${mainPb}`
              : `flex-1 min-w-0 overflow-y-auto overflow-x-hidden bg-background ${mainPb}`
          }
        >
          {children}
        </main>
        {showRightPanel ? rightPanel : null}
      </div>
      {!hideMobileNav && <MobileNav />}
      {!isMessagesRoute && (
        <footer className="hidden lg:block border-t-2 border-folk-cobalt/20 py-3 px-4 bg-[hsl(var(--folk-gold)/0.08)]">
          <LegalFooterLinks />
        </footer>
      )}
    </>
  );
}

export const AppShell = memo(AppShellInner);
